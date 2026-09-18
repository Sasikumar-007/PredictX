import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.metrics import mutual_info_score

class ProxyRiskAnalyzer:
    def __init__(self, sensitive_feature: Optional[str] = None):
        self.sensitive_feature = sensitive_feature

    def analyze(
        self,
        X: np.ndarray,
        feature_names: List[str],
        correlation_matrix: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Assesses potential proxy risk for every feature using correlation strength
        and predictive overlap with other features or sensitive attributes.
        """
        high_pairs = correlation_matrix.get("high_risk_pairs", [])
        feature_max_corr = correlation_matrix.get("feature_max_corr", {})
        
        results = []
        
        for feat in feature_names:
            proxy_score = 0.0
            associated_feature = None
            association_type = "None"
            risk_level = "LOW"
            
            # Check if this feature has a very high correlation with another feature
            max_r = feature_max_corr.get(feat, 0.0)
            
            # Look up partner
            partner_found = False
            for pair in high_pairs:
                if pair["feature_a"] == feat:
                    associated_feature = pair["feature_b"]
                    partner_found = True
                    break
                elif pair["feature_b"] == feat:
                    associated_feature = pair["feature_a"]
                    partner_found = True
                    break
                    
            # Check sensitive attribute relationship if specified
            is_sensitive_overlap = False
            if self.sensitive_feature and self.sensitive_feature in feature_names and feat != self.sensitive_feature:
                # Find correlation with sensitive feature
                for pair in high_pairs:
                    if (pair["feature_a"] == feat and pair["feature_b"] == self.sensitive_feature) or \
                       (pair["feature_b"] == feat and pair["feature_a"] == self.sensitive_feature):
                        is_sensitive_overlap = True
                        associated_feature = self.sensitive_feature
                        break
                        
            if is_sensitive_overlap:
                proxy_score = min(1.0, max_r * 1.1)
                association_type = "Sensitive Attribute Proxy"
                risk_level = "HIGH"
                desc = (
                    f"Feature '{feat}' exhibits strong association with designated sensitive feature '{self.sensitive_feature}'. "
                    f"This creates potential proxy risk where the model may inadvertently base decisions on sensitive characteristics. "
                    f"Note: This is a diagnostic proxy signal, not causal proof."
                )
            elif max_r >= 0.85:
                proxy_score = round(float(max_r), 3)
                association_type = "Redundant Predictive Proxy"
                risk_level = "HIGH" if max_r >= 0.92 else "MODERATE"
                desc = (
                    f"Feature '{feat}' shows high predictive overlap with '{associated_feature}' (|r|={max_r:.2f}). "
                    f"It may serve as an observational proxy. Importance could shift dramatically if either feature is altered."
                )
            elif max_r >= 0.70:
                proxy_score = round(float(max_r * 0.7), 3)
                association_type = "Moderate Co-linear Association"
                risk_level = "MODERATE"
                desc = (
                    f"Feature '{feat}' shares moderate variance (|r|={max_r:.2f}) with '{associated_feature}'. "
                    f"Potential proxy effect is possible but weak."
                )
            else:
                proxy_score = round(float(max_r * 0.3), 3)
                association_type = "Independent Signal"
                risk_level = "LOW"
                desc = f"Feature '{feat}' maintains low correlation with other features; low observational proxy risk."
                
            results.append({
                "feature": feat,
                "proxy_score": round(float(proxy_score), 3),
                "associated_feature": associated_feature,
                "association_type": association_type,
                "risk_level": risk_level,
                "description": desc
            })
            
        results.sort(key=lambda x: x["proxy_score"], reverse=True)
        return results
