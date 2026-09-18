import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.base import clone

class SubgroupAnalyzer:
    def __init__(self, min_sample_size: int = 15):
        self.min_sample_size = min_sample_size

    def find_best_subgroup_feature(
        self,
        df: pd.DataFrame,
        feature_names: List[str],
        user_selected: Optional[str] = None
    ) -> Optional[str]:
        """Identifies a suitable low-cardinality feature (2-4 groups) to slice subgroups."""
        if user_selected and user_selected in df.columns:
            return user_selected
            
        candidates = []
        for col in df.columns:
            # Check unique values
            n_unique = df[col].nunique(dropna=True)
            if 2 <= n_unique <= 4:
                # Check minimum group size
                val_counts = df[col].value_counts()
                if (val_counts >= self.min_sample_size).all():
                    candidates.append((col, n_unique))
                    
        if candidates:
            # Pick the binary one with best balance
            return candidates[0][0]
        return None

    def analyze(
        self,
        base_model: Any,
        X_df: pd.DataFrame,
        y: np.ndarray,
        subgroup_col: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Slices dataset by subgroup and computes feature importance differences across slices.
        """
        feature_names = [c for c in X_df.columns if c != subgroup_col]
        n_features = len(feature_names)
        
        if not subgroup_col or subgroup_col not in X_df.columns:
            # Automatic selection
            subgroup_col = self.find_best_subgroup_feature(X_df, feature_names)
            
        if not subgroup_col:
            return [{
                "feature": f,
                "subgroup_feature": "None",
                "subgroup_importances": {},
                "variation_score": 0.0,
                "sample_sizes": {},
                "is_valid": False,
                "warning": "No categorical column with sufficient sample size (>= 15 per group) found for subgroup analysis."
            } for f in feature_names]
            
        group_series = X_df[subgroup_col]
        groups = group_series.unique()
        
        group_importances: Dict[str, Dict[str, float]] = {}
        sample_sizes: Dict[str, int] = {}
        
        # Prepare feature matrix without subgroup column
        X_features_df = X_df[feature_names]
        
        for g in groups:
            mask = (group_series == g).values
            n_g = int(np.sum(mask))
            sample_sizes[str(g)] = n_g
            
            if n_g < self.min_sample_size:
                continue
                
            y_g = y[mask]
            if len(np.unique(y_g)) < 2:
                # Single class in subgroup
                continue
                
            X_g = X_features_df.iloc[mask].values
            
            try:
                m_g = clone(base_model)
                m_g.fit(X_g, y_g)
                if hasattr(m_g, "feature_importances_"):
                    imp = m_g.feature_importances_
                elif hasattr(m_g, "coef_"):
                    c = m_g.coef_
                    imp = np.mean(np.abs(c), axis=0) if c.ndim > 1 else np.abs(c)
                else:
                    imp = np.ones(n_features) / n_features
                    
                tot = np.sum(imp)
                norm_imp = imp / tot if tot > 0 else np.zeros_like(imp)
                group_importances[str(g)] = {feat: round(float(v), 4) for feat, v in zip(feature_names, norm_imp)}
            except Exception:
                continue
                
        valid_groups = list(group_importances.keys())
        if len(valid_groups) < 2:
            return [{
                "feature": f,
                "subgroup_feature": subgroup_col,
                "subgroup_importances": {},
                "variation_score": 0.0,
                "sample_sizes": sample_sizes,
                "is_valid": False,
                "warning": f"Insufficient sample size in one or more subgroups of '{subgroup_col}' to compare."
            } for f in feature_names]
            
        results = []
        for feat in feature_names:
            imps = [group_importances[g].get(feat, 0.0) for g in valid_groups]
            var = float(np.std(imps))
            max_val = max(imps)
            min_val = min(imps)
            delta = max_val - min_val
            
            # Subgroup variation score: 0 (no difference) to 1.0 (large disparity)
            # Normalized relative to expected maximum variation
            var_score = min(1.0, delta * 3.0)
            
            if var_score >= 0.50:
                warning = (
                    f"Substantial subgroup variation detected across '{subgroup_col}' "
                    f"(importance ranges from {min_val:.2f} in one group to {max_val:.2f} in another). "
                    f"The feature's explanation is heterogeneous across demographic/strata slices."
                )
            elif var_score >= 0.25:
                warning = f"Moderate variation ({min_val:.2f} to {max_val:.2f}) across '{subgroup_col}' subgroups."
            else:
                warning = f"Consistent importance across '{subgroup_col}' subgroups (variance: {var:.3f})."
                
            results.append({
                "feature": feat,
                "subgroup_feature": subgroup_col,
                "subgroup_importances": {g: group_importances[g].get(feat, 0.0) for g in valid_groups},
                "variation_score": round(var_score, 3),
                "sample_sizes": sample_sizes,
                "is_valid": True,
                "warning": warning
            })
            
        results.sort(key=lambda x: x["variation_score"], reverse=True)
        if subgroup_col in X_df.columns:
            results.append({
                "feature": subgroup_col,
                "subgroup_feature": subgroup_col,
                "subgroup_importances": {},
                "variation_score": 0.0,
                "sample_sizes": sample_sizes,
                "is_valid": False,
                "warning": f"Feature '{subgroup_col}' was used as the stratification demographic slice."
            })
        return results
