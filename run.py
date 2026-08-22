import uvicorn
import webbrowser
import os
import time
import threading

def open_browser():
    time.sleep(1.5)
    webbrowser.open("http://localhost:8000")

if __name__ == "__main__":
    print("Iniciando Steam Keys Valuation & Arbitrage Dashboard...")
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("backend.app:app", host="127.0.0.1", port=8000, reload=False)
