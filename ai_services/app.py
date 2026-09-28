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


from app.main import app as fastapi_app, startup_event

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
except ImportError:
    demo = None

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"[FrontWing-AI] Initializing service on port {port}...")

    # Run startup health diagnostics and database migrations
    try:
        startup_event()
    except Exception as e:
        print(f"[FrontWing-AI] Startup check warning: {e}")

    if demo is not None:
        print("[FrontWing-AI] Launching Gradio interface with ZeroGPU integration...")
        gradio_app, local_url, _ = demo.launch(
            prevent_thread_lock=True,
            server_name="0.0.0.0",
            server_port=port,
            ssr_mode=False
        )
        print(f"[FrontWing-AI] Gradio server listening at {local_url}")

        # Attach all FastAPI REST endpoints directly to the Gradio application
        gradio_app.include_router(fastapi_app.router)
        print("[FrontWing-AI] FastAPI REST routers attached to Gradio server successfully.")

        # Keep process active serving traffic
        demo.block_thread()
    else:
        import uvicorn
        uvicorn.run(fastapi_app, host="0.0.0.0", port=port)

