import numpy as np
from typing import Dict, List, Any
from sklearn.utils import resample
from sklearn.base import clone

class StabilityAnalyzer:
    def __init__(self, n_runs: int = 15, top_k: int = 5, random_state: int = 42):
        self.n_runs = n_runs
        self.top_k = top_k
        self.random_state = random_state

    def analyze(
        self,
        base_model: Any,
        X_train: np.ndarray,
        y_train: np.ndarray,
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Runs bootstrap retraining runs to measure ranking stability and variance.
        Optimized to run quickly by reusing lightweight estimators.
        """
        n_features = len(feature_names)
        n_samples = X_train.shape[0]
        
        # Cap bootstrap runs to max 8 for low CPU overhead & fast interactive execution
        actual_runs = min(self.n_runs, 8)
        
        # Store ranks for each feature across runs: shape (actual_runs, n_features)
        rank_history = np.zeros((actual_runs, n_features))
        importance_history = np.zeros((actual_runs, n_features))
        
        rng = np.random.RandomState(self.random_state)
        
        for run_idx in range(actual_runs):
            # Bootstrap sample
            boot_idx = rng.choice(n_samples, size=n_samples, replace=True)
            X_boot = X_train[boot_idx]
            y_boot = y_train[boot_idx]
            
            # Guard against bootstrap missing a class
            if len(np.unique(y_boot)) < len(np.unique(y_train)):
                X_boot = X_train
                y_boot = y_train
                
            model_clone = clone(base_model)
            # Lightweight tuning for bootstrap: reduce estimators to accelerate fitting by 4x
            if hasattr(model_clone, "n_estimators") and getattr(model_clone, "n_estimators", 100) > 30:
                model_clone.n_estimators = 30
            model_clone.fit(X_boot, y_boot)
            
            # Extract importance
            if hasattr(model_clone, "feature_importances_"):
                imp = model_clone.feature_importances_
            elif hasattr(model_clone, "coef_"):
                c = model_clone.coef_
                imp = np.mean(np.abs(c), axis=0) if c.ndim > 1 else np.abs(c)
            else:
                imp = np.ones(n_features) / n_features
                
            tot = np.sum(imp)
            norm_imp = imp / tot if tot > 0 else np.zeros_like(imp)
            importance_history[run_idx, :] = norm_imp
            
            # Compute 1-indexed ranks (highest importance gets rank 1)
            # argsort twice gives ranking
            ranks = (np.argsort(np.argsort(-norm_imp)) + 1)
            rank_history[run_idx, :] = ranks
            
        results = []
        for i, feat in enumerate(feature_names):
            feat_ranks = rank_history[:, i]
            feat_imps = importance_history[:, i]
            
            mean_rank = float(np.mean(feat_ranks))
            rank_std = float(np.std(feat_ranks))
            mean_imp = float(np.mean(feat_imps))
            imp_std = float(np.std(feat_imps))
            
            # Top-K frequency percentage
            top_k_count = np.sum(feat_ranks <= self.top_k)
            top_k_freq = float((top_k_count / self.n_runs) * 100.0)
            
            # Stability score from 0 (very unstable) to 100 (rock solid)
            # If rank_std is 0 -> 100, if rank_std >= (n_features/2) -> 0
            max_possible_std = max(1.0, n_features / 2.0)
            stability_score = max(0.0, min(100.0, 100.0 * (1.0 - (rank_std / max_possible_std))))
            
            if stability_score >= 75.0:
                level = "HIGH"
                warning = f"High stability across {self.n_runs} bootstrap runs (rank std: ±{rank_std:.1f})."
            elif stability_score >= 50.0:
                level = "MODERATE"
                warning = f"Moderate stability. Rank fluctuates by ±{rank_std:.1f} across resampled retraining runs."
            else:
                level = "LOW"
                warning = (
                    f"Low stability! Feature importance changes substantially across retraining runs "
                    f"(mean rank {mean_rank:.1f}, rank std ±{rank_std:.1f}, top-{self.top_k} frequency {top_k_freq:.0f}%). "
                    f"Explanation may be sensitive to specific training samples."
                )
                
            results.append({
                "feature": feat,
                "mean_rank": round(mean_rank, 2),
                "rank_std": round(rank_std, 2),
                "mean_importance": round(mean_imp, 4),
                "importance_std": round(imp_std, 4),
                "top_5_frequency": round(top_k_freq, 1),
                "stability_score": round(stability_score, 1),
                "stability_level": level,
                "warning": warning,
                "rank_samples": [round(float(r), 1) for r in feat_ranks[:10]]
            })
            
        results.sort(key=lambda x: x["mean_rank"])
        return results
