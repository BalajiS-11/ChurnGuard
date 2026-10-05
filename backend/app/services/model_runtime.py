import os
import joblib
from pathlib import Path
from typing import Dict, Any, Optional
from ml.explain import ModelExplainer
from backend.app.core.config import settings

class ModelRuntime:
    _instance: Optional['ModelRuntime'] = None
    
    def __init__(self):
        self.bundle: Optional[Dict[str, Any]] = None
        self.explainer: Optional[ModelExplainer] = None
        self.model_version: str = "v1.0.0"
        
    @classmethod
    def get_instance(cls) -> 'ModelRuntime':
        if cls._instance is None:
            cls._instance = ModelRuntime()
        return cls._instance
        
    def load(self, model_path: Optional[str] = None):
        path = model_path or settings.MODEL_PATH
        if not os.path.exists(path):
            raise FileNotFoundError(f"Model artifact not found at {path}. Please train the model first.")
            
        print(f"Loading ML model artifact from {path}...")
        self.bundle = joblib.load(path)
        
        # Instantiate SHAP explainer
        self.explainer = ModelExplainer(
            self.bundle["base_classifier"],
            self.bundle["preprocessor"]
        )
        self.model_version = self.bundle.get("version", "v1.0.0")
        print(f"Model {self.model_version} loaded successfully into memory.")
        
    def is_loaded(self) -> bool:
        return self.bundle is not None and self.explainer is not None

def get_runtime() -> ModelRuntime:
    runtime = ModelRuntime.get_instance()
    if not runtime.is_loaded():
        runtime.load()
    return runtime
