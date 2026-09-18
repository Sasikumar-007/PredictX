import numpy as np
from typing import Dict, List, Any
from sklearn.metrics import f1_score

class PerturbationAnalyzer:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state

    def analyze(
        self,
        model: Any,
        X_test: np.ndarray,
        y_test: np.ndarray,
        feature_names: List[str],
        unified_importances: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Tests model functional sensitivity to feature perturbation (shuffle and zeroing).
        Detects features with high explanation importance but negligible functional impact.
        """
        n_classes = len(np.unique(y_test))
        avg_mode = "binary" if n_classes <= 2 else "macro"
        
        # Baseline F1
        y_pred_base = model.predict(X_test)
        baseline_f1 = float(f1_score(y_test, y_pred_base, average=avg_mode, zero_division=0))
        
        n_samples = X_test.shape[0]
        rng = np.random.RandomState(self.random_state)
        
        results = []
        for i, feat in enumerate(feature_names):
            # 1. Shuffle perturbation
            X_shuffled = X_test.copy()
            shuffle_idx = rng.permutation(n_samples)
            X_shuffled[:, i] = X_shuffled[shuffle_idx, i]
            
            y_pred_shuffled = model.predict(X_shuffled)
            shuffled_f1 = float(f1_score(y_test, y_pred_shuffled, average=avg_mode, zero_division=0))
            
            # 2. Removal perturbation (mask with feature mean)
            X_removed = X_test.copy()
            X_removed[:, i] = np.mean(X_test[:, i])
            y_pred_removed = model.predict(X_removed)
            removed_f1 = float(f1_score(y_test, y_pred_removed, average=avg_mode, zero_division=0))
            
            # Delta is performance degradation caused by perturbation
            f1_drop = max(0.0, baseline_f1 - shuffled_f1)
            removal_drop = max(0.0, baseline_f1 - removed_f1)
            
            # Compare explanation importance to functional impact
            imp = unified_importances.get(feat, 0.0)
            
            # If importance is in top bracket (> 0.15) but f1 drop is < 0.02 -> INCONSISTENT
            if imp >= 0.12 and f1_drop < 0.015:
                functional_impact = "INCONSISTENT"
                warning = (
                    f"Perturbation discrepancy! The feature receives high explanation importance ({imp:.2f}), "
                    f"yet shuffling it only causes a {f1_drop:.3f} change in F1 score. "
                    f"The model may be relying on correlated substitutes rather than true functional dependence."
                )
            elif f1_drop >= 0.05:
                functional_impact = "STRONG"
                warning = f"Strong functional impact. Perturbing this feature degrades model F1 by {f1_drop:.3f}."
            elif f1_drop >= 0.02:
                functional_impact = "MODERATE"
                warning = f"Moderate functional impact (F1 delta: {f1_drop:.3f})."
            else:
                functional_impact = "WEAK"
                warning = f"Low functional impact on predictions (F1 delta: {f1_drop:.3f})."
                
            results.append({
                "feature": feat,
                "baseline_f1": round(baseline_f1, 4),
                "shuffled_f1": round(shuffled_f1, 4),
                "removed_f1": round(removed_f1, 4),
                "f1_delta": round(f1_drop, 4),
                "functional_impact": functional_impact,
                "warning": warning
            })
            
        results.sort(key=lambda x: x["f1_delta"], reverse=True)
        return results
