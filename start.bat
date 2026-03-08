@echo off
echo Starting Worduel...

:: Backend
cd backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
start "Worduel Backend" python main.py
echo Backend started at http://localhost:8000

:: Frontend
cd ..\frontend
call npm install
start "Worduel Frontend" npm start
echo Frontend started at http://localhost:3000

echo.
echo Worduel is running!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
pause
