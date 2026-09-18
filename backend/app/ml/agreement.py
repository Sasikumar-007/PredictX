import numpy as np
from typing import Dict, List, Any
from scipy.stats import spearmanr

class ModelAgreementAnalyzer:
    def __init__(self, top_k: int = 5):
        self.top_k = top_k

    def analyze(
        self,
        trained_models: Dict[str, Any],
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """
        Calculates cross-model agreement matrix and per-feature rank variance across model families.
        """
        model_names = list(trained_models.keys())
        n_models = len(model_names)
        n_features = len(feature_names)
        
        # Calculate feature importances and ranks for each model
        model_ranks: Dict[str, Dict[str, int]] = {}
        model_importances: Dict[str, Dict[str, float]] = {}
        
        for m_name, model in trained_models.items():
            if hasattr(model, "feature_importances_"):
                imp = model.feature_importances_
            elif hasattr(model, "coef_"):
                c = model.coef_
                imp = np.mean(np.abs(c), axis=0) if c.ndim > 1 else np.abs(c)
            else:
                imp = np.ones(n_features) / n_features
                
            tot = np.sum(imp)
            norm_imp = imp / tot if tot > 0 else np.zeros_like(imp)
            
            # Rank (1-indexed)
            ranks = (np.argsort(np.argsort(-norm_imp)) + 1).tolist()
            model_ranks[m_name] = {feat: int(r) for feat, r in zip(feature_names, ranks)}
            model_importances[m_name] = {feat: round(float(v), 4) for feat, v in zip(feature_names, norm_imp)}
            
        # 1. Model Agreement Correlation Matrix
        matrix_records = []
        for i, m1 in enumerate(model_names):
            row_data = {"model": m1}
            ranks1 = [model_ranks[m1][f] for f in feature_names]
            for j, m2 in enumerate(model_names):
                if i == j:
                    row_data[m2] = 1.0
                else:
                    ranks2 = [model_ranks[m2][f] for f in feature_names]
                    rho, _ = spearmanr(ranks1, ranks2)
                    row_data[m2] = round(float(rho) if not np.isnan(rho) else 0.0, 3)
            matrix_records.append(row_data)
            
        # 2. Per-feature Rank Variation & Disagreement
        feature_agreements = []
        for feat in feature_names:
            ranks = [model_ranks[m][feat] for m in model_names]
            rank_var = float(np.var(ranks))
            rank_std = float(np.std(ranks))
            min_r = min(ranks)
            max_r = max(ranks)
            rank_spread = max_r - min_r
            
            # Agreement score: 100 if spread is 0, decreases with spread
            max_spread = max(1.0, n_features - 1)
            agreement_score = max(0.0, min(100.0, 100.0 * (1.0 - (rank_spread / max_spread))))
            
            if agreement_score >= 70.0:
                level = "HIGH"
                warning = f"Consistent ranking across all tested model families (ranks: {min_r}-{max_r})."
            elif agreement_score >= 40.0:
                level = "MODERATE"
                warning = f"Moderate rank variation across model families (ranks range from {min_r} to {max_r})."
            else:
                level = "LOW"
                warning = (
                    f"High model disagreement! Rank ranges from {min_r} to {max_r} across model architectures. "
                    f"This feature's explanation is strongly model-dependent."
                )
                
            feature_agreements.append({
                "feature": feat,
                "rank_variance": round(rank_var, 2),
                "rank_std": round(rank_std, 2),
                "rank_spread": rank_spread,
                "agreement_score": round(agreement_score, 1),
                "agreement_level": level,
                "warning": warning,
                "model_ranks": {m: model_ranks[m][feat] for m in model_names},
                "model_importances": {m: model_importances[m][feat] for m in model_names}
            })
            
        feature_agreements.sort(key=lambda x: x["agreement_score"])
        
        return {
            "agreement_matrix": matrix_records,
            "feature_agreements": feature_agreements,
            "model_names": model_names
        }
