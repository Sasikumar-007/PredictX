import pandas as pd
import numpy as np
from typing import Tuple, Dict, List, Any, Optional
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import SimpleImputer

class DataPreprocessor:
    def __init__(self):
        self.original_feature_names: List[str] = []
        self.feature_names: List[str] = []
        self.numerical_cols: List[str] = []
        self.categorical_cols: List[str] = []
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.target_encoder: Optional[LabelEncoder] = None
        self.scaler: Optional[StandardScaler] = None
        self.metadata: Dict[str, Any] = {}

    def profile_dataframe(self, df: pd.DataFrame, target_col: Optional[str] = None) -> Dict[str, Any]:
        """Profiles a dataframe for data types, missingness, cardinality, and target characteristics."""
        row_count, col_count = df.shape
        missing_counts = df.isnull().sum().to_dict()
        
        numerical_features = []
        categorical_features = []
        constant_features = []
        cardinality = {}
        
        for col in df.columns:
            if col == target_col:
                continue
            unique_count = df[col].nunique(dropna=True)
            cardinality[col] = unique_count
            
            if unique_count <= 1:
                constant_features.append(col)
                continue
                
            if pd.api.types.is_numeric_dtype(df[col]):
                # If numeric but only 2 unique values, still treat as numeric for VIF/corr
                numerical_features.append(col)
            else:
                categorical_features.append(col)
                
        target_info = {}
        if target_col and target_col in df.columns:
            target_series = df[target_col].dropna()
            n_unique = target_series.nunique()
            classes = sorted(list(target_series.unique()))
            if n_unique <= 2:
                target_type = "binary_classification"
            elif n_unique <= 20 and not pd.api.types.is_float_dtype(target_series):
                target_type = "multiclass_classification"
            else:
                target_type = "regression"
            target_info = {
                "target_type": target_type,
                "target_classes": [str(c) for c in classes[:20]],
                "class_counts": df[target_col].value_counts().to_dict()
            }
            
        sample_preview = df.head(10).replace({np.nan: None}).to_dict(orient="records")
        
        return {
            "row_count": row_count,
            "column_count": col_count,
            "features": [c for c in df.columns if c != target_col],
            "target_column": target_col,
            "target_info": target_info,
            "missing_value_counts": {k: int(v) for k, v in missing_counts.items()},
            "numerical_features": numerical_features,
            "categorical_features": categorical_features,
            "constant_features": constant_features,
            "cardinality": cardinality,
            "sample_preview": sample_preview
        }

    def preprocess(
        self,
        df: pd.DataFrame,
        target_col: str,
        scale_features: bool = False
    ) -> Tuple[np.ndarray, np.ndarray, List[str], Dict[str, Any]]:
        """
        Preprocesses dataframe into clean X and y arrays.
        Guarantees informative exceptions if dataset is invalid.
        """
        if target_col not in df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")
            
        warnings = []
        dropped_cols = []
        imputed_cols = {}
        encoded_cols = {}
        scaled_cols = []
        
        # 1. Check target
        if df[target_col].isnull().any():
            nan_count = int(df[target_col].isnull().sum())
            warnings.append(f"Target column '{target_col}' contains {nan_count} missing values; rows were dropped.")
            df = df.dropna(subset=[target_col]).copy()
            
        if df.shape[0] < 20:
            raise ValueError("Dataset has fewer than 20 rows. Too small for statistical reliability analysis.")
            
        y_raw = df[target_col]
        if y_raw.nunique() < 2:
            raise ValueError(f"Target column '{target_col}' contains only one unique class. Cannot train classifier.")
            
        # Target Encoding
        if not pd.api.types.is_numeric_dtype(y_raw) or y_raw.dtype == object:
            self.target_encoder = LabelEncoder()
            y = self.target_encoder.fit_transform(y_raw.astype(str))
        else:
            y = y_raw.values.astype(int)
            
        # 2. Separate features
        X_df = df.drop(columns=[target_col]).copy()
        
        # Drop constant columns
        for col in list(X_df.columns):
            if X_df[col].nunique(dropna=True) <= 1:
                dropped_cols.append(col)
                warnings.append(f"Feature '{col}' has zero variance (constant) and was dropped.")
                X_df.drop(columns=[col], inplace=True)
                
        # Drop high-cardinality non-numeric (e.g. ID strings, names)
        for col in list(X_df.columns):
            if not pd.api.types.is_numeric_dtype(X_df[col]):
                card = X_df[col].nunique()
                if card > 0.5 * len(X_df) and card > 50:
                    dropped_cols.append(col)
                    warnings.append(f"Feature '{col}' has very high cardinality ({card} unique values) like an ID and was dropped.")
                    X_df.drop(columns=[col], inplace=True)
                    
        if X_df.shape[1] == 0:
            raise ValueError("No valid predictive features remaining after dropping constant/ID columns.")
            
        # 3. Imputation and Encoding
        final_dfs = []
        feature_names = []
        
        for col in X_df.columns:
            series = X_df[col]
            if pd.api.types.is_numeric_dtype(series):
                if series.isnull().any():
                    median_val = float(series.median())
                    series = series.fillna(median_val)
                    imputed_cols[col] = f"median ({median_val:.2f})"
                col_df = pd.DataFrame({col: series})
                final_dfs.append(col_df)
                feature_names.append(col)
            else:
                if series.isnull().any():
                    mode_val = str(series.mode()[0]) if not series.mode().empty else "missing"
                    series = series.fillna(mode_val)
                    imputed_cols[col] = f"mode ({mode_val})"
                
                # Low cardinality -> One-Hot or Label
                if series.nunique() <= 10:
                    # One-hot
                    dummies = pd.get_dummies(series, prefix=col, drop_first=False, dtype=float)
                    final_dfs.append(dummies)
                    encoded_cols[col] = f"one-hot ({len(dummies.columns)} categories)"
                    feature_names.extend(dummies.columns.tolist())
                else:
                    # Label encoding
                    le = LabelEncoder()
                    encoded = le.fit_transform(series.astype(str))
                    self.label_encoders[col] = le
                    col_df = pd.DataFrame({col: encoded})
                    final_dfs.append(col_df)
                    encoded_cols[col] = f"ordinal label encoded ({series.nunique()} categories)"
                    feature_names.append(col)
                    
        X_processed = pd.concat(final_dfs, axis=1)
        
        # Scaling if requested
        if scale_features:
            self.scaler = StandardScaler()
            X_arr = self.scaler.fit_transform(X_processed)
            scaled_cols = feature_names[:]
        else:
            X_arr = X_processed.values.astype(np.float64)
            
        self.feature_names = feature_names
        
        summary = {
            "original_row_count": int(df.shape[0]),
            "cleaned_row_count": int(X_arr.shape[0]),
            "imputed_columns": imputed_cols,
            "encoded_columns": encoded_cols,
            "scaled_columns": scaled_cols,
            "dropped_columns": dropped_cols,
            "warnings": warnings,
            "processed_feature_count": len(feature_names)
        }
        
        return X_arr, y, feature_names, summary
