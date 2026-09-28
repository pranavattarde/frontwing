try:
    import spaces
except ImportError:
    class spaces:
        @staticmethod
        def GPU(fn=None, *args, **kwargs):
            if fn:
                return fn
            def decorator(f):
                return f
            return decorator

import os
import sys

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

try:
    import gradio as gr

    @spaces.GPU
    def check_status(query: str = "") -> str:
        """Primary handler satisfying Hugging Face ZeroGPU runtime requirement."""
        return "FrontWing AI Services Engine is Online and Serving API Traffic."

    demo = gr.Interface(
        fn=check_status,
        inputs="text",
        outputs="text",
        title="FrontWing AI Services",
        description="FastAPI backend engine powering telemetry analysis, strategy simulations, and 3D Ghost Battle."
    )

    # Mount Gradio interface onto existing FastAPI application
    app = gr.mount_gradio_app(app, demo, path="/")
except ImportError:
    pass

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
