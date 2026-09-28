"""
server.py - Hugging Face Spaces entrypoint for FrontWing AI Services

Mounts FrontWing's FastAPI application onto a lightweight Gradio status UI.
All FastAPI endpoints (/engineer/query, /strategy/query, /health, etc.)
remain fully active and serve production API requests with 16 GB RAM.
"""

import os
import sys

# Ensure current directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

try:
    import spaces

    @spaces.GPU
    def zero_gpu_probe():
        """Satisfies Hugging Face ZeroGPU supervisor requirement."""
        return True
except ImportError:
    pass

try:
    import gradio as gr

    with gr.Blocks(title="FrontWing AI Services") as demo:
        gr.Markdown("# 🏎️ FrontWing AI Services")
        gr.Markdown(
            "FastAPI backend engine powering high-frequency telemetry processing, "
            "counterfactual race strategy simulations, and 3D Ghost Battle."
        )
        gr.Markdown("### ✅ System Status: **Online & Serving API Traffic**")

    # Mount Gradio interface onto the existing FastAPI application
    app = gr.mount_gradio_app(app, demo, path="/")
except ImportError:
    pass

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
