#!/bin/bash
# Start both backend and frontend

echo "🚀 Starting Worduel..."

# Backend
cd backend
python -m venv venv 2>/dev/null || true
source venv/bin/activate
pip install -r requirements.txt -q
echo "✅ Backend dependencies installed"
python main.py &
BACKEND_PID=$!
echo "✅ Backend running at http://localhost:8000 (PID: $BACKEND_PID)"

# Frontend
cd ../frontend
npm install --silent
echo "✅ Frontend dependencies installed"
npm start &
FRONTEND_PID=$!
echo "✅ Frontend running at http://localhost:3000 (PID: $FRONTEND_PID)"

echo ""
echo "⚔️  Worduel is running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
