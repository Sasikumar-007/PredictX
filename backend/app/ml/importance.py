import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

class FeatureImportanceEngine:
    def __init__(self, random_state: int = 42):
        self.random_state = random_state

    def compute_model_importance(self, model: Any, feature_names: List[str]) -> Dict[str, float]:
        """Calculates native model-based feature importance."""
        n_features = len(feature_names)
        scores = np.zeros(n_features)
        
        if hasattr(model, "feature_importances_"):
            scores = model.feature_importances_
        elif hasattr(model, "coef_"):
            # Logistic regression coefficients
            coef = model.coef_
            if coef.ndim > 1:
                scores = np.mean(np.abs(coef), axis=0)
            else:
                scores = np.abs(coef)
        else:
            scores = np.ones(n_features) / n_features
            
        # Normalize to sum to 1.0
        total = np.sum(scores)
        if total > 0:
            scores = scores / total
            
        return {feat: float(score) for feat, score in zip(feature_names, scores)}

    def compute_permutation_importance(
        self,
        model: Any,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: List[str],
        n_repeats: int = 5
    ) -> Tuple[Dict[str, float], Dict[str, float]]:
        """Calculates permutation importance on validation set."""
        try:
            r = permutation_importance(
                model, X_val, y_val,
                n_repeats=n_repeats,
                random_state=self.random_state,
                scoring="f1_macro" if len(np.unique(y_val)) > 2 else "f1",
                n_jobs=1
            )
            means = np.maximum(0, r.importances_mean)
            stds = r.importances_std
            
            total = np.sum(means)
            norm_means = means / total if total > 0 else np.zeros_like(means)
            
            mean_dict = {f: float(m) for f, m in zip(feature_names, norm_means)}
            std_dict = {f: float(s) for f, s in zip(feature_names, stds)}
            return mean_dict, std_dict
        except Exception as e:
            # Graceful fallback: equal weighting or model importance
            fallback = self.compute_model_importance(model, feature_names)
            return fallback, {f: 0.0 for f in feature_names}

    def compute_shap_importance(
        self,
        model: Any,
        X_train: np.ndarray,
        X_val: np.ndarray,
        feature_names: List[str],
        max_background: int = 100
    ) -> Dict[str, float]:
        """Calculates mean absolute SHAP values with subsampling for speed."""
        n_features = len(feature_names)
        if not SHAP_AVAILABLE:
            # Fallback to model importance if SHAP library is unavailable
            return self.compute_model_importance(model, feature_names)
            
        try:
            # Subsample background data for speed and low RAM footprint
            if X_train.shape[0] > max_background:
                np.random.seed(self.random_state)
                idx = np.random.choice(X_train.shape[0], max_background, replace=False)
                background = X_train[idx]
            else:
                background = X_train
                
            # Subsample evaluation samples for speed (100 samples is ideal for global ranking)
            val_samples = X_val if X_val.shape[0] <= 100 else X_val[:100]
            
            if isinstance(model, LogisticRegression):
                explainer = shap.LinearExplainer(model, background)
                shap_values = explainer.shap_values(val_samples)
            elif hasattr(model, "predict_proba") and any(k in model.__class__.__name__ for k in ("Tree", "Forest", "XGB")):
                try:
                    # Native TreeSHAP runs in O(TLD^2) which takes milliseconds
                    explainer = shap.TreeExplainer(model)
                    shap_values = explainer.shap_values(val_samples, check_additivity=False)
                except Exception:
                    # Fallback to background-assisted explainer with small background
                    explainer = shap.TreeExplainer(model, data=background[:30])
                    shap_values = explainer.shap_values(val_samples, check_additivity=False)
            else:
                explainer = shap.Explainer(model.predict, background[:30])
                shap_values = explainer(val_samples).values
                
            # Process shap_values into 1D mean absolute importance
            if isinstance(shap_values, list):
                # Multiclass list of arrays
                abs_vals = [np.abs(sv) for sv in shap_values]
                mean_abs = np.mean(np.mean(abs_vals, axis=0), axis=0)
            elif isinstance(shap_values, np.ndarray):
                if shap_values.ndim == 3:
                    # (n_samples, n_features, n_classes)
                    mean_abs = np.mean(np.mean(np.abs(shap_values), axis=2), axis=0)
                else:
                    mean_abs = np.mean(np.abs(shap_values), axis=0)
            else:
                mean_abs = np.mean(np.abs(np.array(shap_values)), axis=0)
                
            # Normalize
            total = np.sum(mean_abs)
            norm_shap = mean_abs / total if total > 0 else np.ones(n_features) / n_features
            return {f: float(s) for f, s in zip(feature_names, norm_shap)}
        except Exception as e:
            # Fallback to model importance if TreeExplainer fails
            return self.compute_model_importance(model, feature_names)

    def generate_unified_table(
        self,
        model: Any,
        X_train: np.ndarray,
        X_val: np.ndarray,
        y_val: np.ndarray,
        feature_names: List[str]
    ) -> List[Dict[str, Any]]:
        """Produces a unified feature importance table across SHAP, Permutation, and Native."""
        model_imp = self.compute_model_importance(model, feature_names)
        perm_imp, _ = self.compute_permutation_importance(model, X_val, y_val, feature_names)
        shap_imp = self.compute_shap_importance(model, X_train, X_val, feature_names)
        
        items = []
        for feat in feature_names:
            s_val = shap_imp.get(feat, 0.0)
            p_val = perm_imp.get(feat, 0.0)
            m_val = model_imp.get(feat, 0.0)
            # Unified score is consensus average
            unified = (0.5 * s_val) + (0.3 * p_val) + (0.2 * m_val)
            items.append({
                "feature": feat,
                "shap_importance": round(s_val, 4),
                "permutation_importance": round(p_val, 4),
                "model_importance": round(m_val, 4),
                "consensus_importance": round(unified, 4)
            })
            
        # Sort by consensus importance descending
        items.sort(key=lambda x: x["consensus_importance"], reverse=True)
        for rank, item in enumerate(items, start=1):
            item["unified_rank"] = rank
            
        return items
