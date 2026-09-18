import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple

class CorrelationAnalyzer:
    def __init__(self, threshold: float = 0.80):
        self.threshold = threshold

    def analyze(
        self,
        X: np.ndarray,
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """
        Computes Pearson and Spearman correlation matrices.
        Identifies pairs that exceed the risk threshold.
        """
        df = pd.DataFrame(X, columns=feature_names)
        
        # Pearson correlation matrix
        pearson_corr = df.corr(method="pearson").fillna(0.0)
        # Spearman correlation matrix
        spearman_corr = df.corr(method="spearman").fillna(0.0)
        
        n_features = len(feature_names)
        high_corr_pairs = []
        feature_max_corr: Dict[str, float] = {f: 0.0 for f in feature_names}
        feature_corr_partners: Dict[str, List[Dict[str, Any]]] = {f: [] for f in feature_names}
        
        for i in range(n_features):
            feat_a = feature_names[i]
            for j in range(i + 1, n_features):
                feat_b = feature_names[j]
                val = float(pearson_corr.iloc[i, j])
                abs_val = abs(val)
                
                # Update max correlation for each feature
                if abs_val > feature_max_corr[feat_a]:
                    feature_max_corr[feat_a] = abs_val
                if abs_val > feature_max_corr[feat_b]:
                    feature_max_corr[feat_b] = abs_val
                    
                if abs_val >= self.threshold:
                    risk_level = "HIGH" if abs_val >= 0.90 else "MODERATE"
                    pair_info = {
                        "feature_a": feat_a,
                        "feature_b": feat_b,
                        "correlation": round(val, 3),
                        "abs_correlation": round(abs_val, 3),
                        "risk_level": risk_level,
                        "warning": (
                            f"Strong correlation ({val:+.2f}) detected between '{feat_a}' and '{feat_b}'. "
                            f"Feature importance may be split, diluted, or arbitrarily assigned between them. "
                            f"Note: Correlation reflects linear co-movement, not causal influence."
                        )
                    }
                    high_corr_pairs.append(pair_info)
                    feature_corr_partners[feat_a].append({"partner": feat_b, "r": round(val, 3)})
                    feature_corr_partners[feat_b].append({"partner": feat_a, "r": round(val, 3)})
                    
        # Sort pairs by absolute correlation descending
        high_corr_pairs.sort(key=lambda x: x["abs_correlation"], reverse=True)
        
        # Convert matrix to json serializable list of dicts
        matrix_records = []
        for i, row_name in enumerate(feature_names):
            row_data = {"feature": row_name}
            for j, col_name in enumerate(feature_names):
                row_data[col_name] = round(float(pearson_corr.iloc[i, j]), 3)
            matrix_records.append(row_data)
            
        return {
            "matrix": matrix_records,
            "feature_names": feature_names,
            "high_risk_pairs": high_corr_pairs,
            "feature_max_corr": {k: round(v, 3) for k, v in feature_max_corr.items()},
            "feature_corr_partners": feature_corr_partners,
            "threshold_used": self.threshold
        }
