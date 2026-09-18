import numpy as np
import pandas as pd
from typing import Dict, List, Any

class VIFAnalyzer:
    def __init__(self, moderate_threshold: float = 5.0, high_threshold: float = 10.0):
        self.moderate_threshold = moderate_threshold
        self.high_threshold = high_threshold

    def calculate_vif(self, X: np.ndarray, feature_names: List[str]) -> List[Dict[str, Any]]:
        """
        Calculates Variance Inflation Factor (VIF) for each feature.
        Uses numerically stabilized linear algebra / R^2 regression.
        """
        n_samples, n_features = X.shape
        if n_features < 2:
            return [{
                "feature": feature_names[0],
                "vif": 1.0,
                "risk_level": "LOW",
                "warning": "Only one feature in dataset; VIF is 1.0."
            }]
            
        # Standardize X to avoid scale biases in VIF
        X_mean = np.mean(X, axis=0)
        X_std = np.std(X, axis=0)
        X_std[X_std == 0] = 1.0  # Guard against zero variance
        X_norm = (X - X_mean) / X_std
        
        results = []
        
        # We compute VIF by regressing each feature i against all other features
        for i in range(n_features):
            feat_name = feature_names[i]
            y_i = X_norm[:, i]
            # Exclude feature i
            idx_others = [j for j in range(n_features) if j != i]
            X_others = X_norm[:, idx_others]
            
            # Add intercept
            X_with_intercept = np.column_stack([np.ones(n_samples), X_others])
            
            try:
                # OLS solution using least squares: beta = (X^T X)^-1 X^T y
                # lstsq is robust to rank deficiency
                beta, residuals, rank, s = np.linalg.lstsq(X_with_intercept, y_i, rcond=None)
                y_pred = X_with_intercept @ beta
                
                # R^2 calculation
                ss_tot = np.sum((y_i - np.mean(y_i)) ** 2)
                ss_res = np.sum((y_i - y_pred) ** 2)
                
                if ss_tot > 0:
                    r_squared = max(0.0, min(1.0 - (ss_res / ss_tot), 0.9999))
                else:
                    r_squared = 0.0
                    
                vif = 1.0 / (1.0 - r_squared)
            except Exception:
                vif = 1.0
                
            # Cap extreme infinity values
            vif = min(vif, 999.0)
            
            if vif >= self.high_threshold:
                risk_level = "HIGH"
                warning = f"High multicollinearity (VIF={vif:.1f} > {self.high_threshold}). The feature's information is largely redundant with a linear combination of other features."
            elif vif >= self.moderate_threshold:
                risk_level = "MODERATE"
                warning = f"Moderate multicollinearity (VIF={vif:.1f}). Some variance overlap exists with other features."
            else:
                risk_level = "LOW"
                warning = f"Low multicollinearity (VIF={vif:.1f}). Variance inflation is minimal."
                
            results.append({
                "feature": feat_name,
                "vif": round(float(vif), 2),
                "risk_level": risk_level,
                "warning": warning
            })
            
        results.sort(key=lambda x: x["vif"], reverse=True)
        return results
