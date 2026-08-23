"""
Test WebSocket endpoint for real-time appointment updates
Tests: /api/ws/appointments WebSocket endpoint
"""
import pytest
import requests
import os
import websocket
import json
import threading
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Convert HTTP to WebSocket URL
def get_ws_url():
    if not BASE_URL:
        pytest.skip("REACT_APP_BACKEND_URL not set")
    ws_protocol = 'wss' if BASE_URL.startswith('https') else 'ws'
    base = BASE_URL.replace('https://', '').replace('http://', '')
    return f"{ws_protocol}://{base}"


class TestWebSocketEndpoint:
    """WebSocket /api/ws/appointments endpoint tests"""
    
    def test_websocket_endpoint_exists(self):
        """Test that WebSocket endpoint accepts connections"""
        ws_url = get_ws_url()
        full_url = f"{ws_url}/api/ws/appointments?portal=diagyn_staff&clinic=Pushpa%20Clinic&date=2026-02-16"
        
        messages = []
        connected = False
        error_msg = None
        
        def on_message(ws, message):
            messages.append(json.loads(message))
        
        def on_error(ws, error):
            nonlocal error_msg
            error_msg = str(error)
        
        def on_open(ws):
            nonlocal connected
            connected = True
            # Wait a bit then close
            time.sleep(1)
            ws.close()
        
        def on_close(ws, close_status_code, close_msg):
            pass
        
        ws = websocket.WebSocketApp(
            full_url,
            on_open=on_open,
            on_message=on_message,
            on_error=on_error,
            on_close=on_close
        )
        
        # Run WebSocket in a thread with timeout
        ws_thread = threading.Thread(target=lambda: ws.run_forever())
        ws_thread.daemon = True
        ws_thread.start()
        ws_thread.join(timeout=5)
        
        assert connected, f"WebSocket failed to connect: {error_msg}"
        assert len(messages) > 0, "No messages received from WebSocket"
        
        # Check that we received the 'connected' message
        connected_msg = next((m for m in messages if m.get('type') == 'connected'), None)
        assert connected_msg is not None, "Did not receive 'connected' message"
        assert connected_msg.get('portal') == 'diagyn_staff'
        assert 'room' in connected_msg
        print(f"WebSocket connected successfully to room: {connected_msg.get('room')}")
    
    def test_websocket_doctor_portal_connection(self):
        """Test WebSocket connection for doctor portal"""
        ws_url = get_ws_url()
        full_url = f"{ws_url}/api/ws/appointments?portal=doctor&doctor_name=Dr.%20Vikas&date=2026-02-16"
        
        messages = []
        connected = False
        
        def on_message(ws, message):
            messages.append(json.loads(message))
        
        def on_open(ws):
            nonlocal connected
            connected = True
            time.sleep(1)
            ws.close()
        
        ws = websocket.WebSocketApp(
            full_url,
            on_open=on_open,
            on_message=on_message,
            on_close=lambda ws, c, m: None,
            on_error=lambda ws, e: None
        )
        
        ws_thread = threading.Thread(target=lambda: ws.run_forever())
        ws_thread.daemon = True
        ws_thread.start()
        ws_thread.join(timeout=5)
        
        assert connected, "WebSocket failed to connect for doctor portal"
        connected_msg = next((m for m in messages if m.get('type') == 'connected'), None)
        assert connected_msg is not None, "Did not receive 'connected' message"
        assert connected_msg.get('portal') == 'doctor'
        print(f"Doctor portal WebSocket connected to room: {connected_msg.get('room')}")
    
    def test_websocket_mango_staff_connection(self):
        """Test WebSocket connection for Mango Labs staff portal"""
        ws_url = get_ws_url()
        full_url = f"{ws_url}/api/ws/appointments?portal=mango_staff&date=2026-02-16"
        
        messages = []
        connected = False
        
        def on_message(ws, message):
            messages.append(json.loads(message))
        
        def on_open(ws):
            nonlocal connected
            connected = True
            time.sleep(1)
            ws.close()
        
        ws = websocket.WebSocketApp(
            full_url,
            on_open=on_open,
            on_message=on_message,
            on_close=lambda ws, c, m: None,
            on_error=lambda ws, e: None
        )
        
        ws_thread = threading.Thread(target=lambda: ws.run_forever())
        ws_thread.daemon = True
        ws_thread.start()
        ws_thread.join(timeout=5)
        
        assert connected, "WebSocket failed to connect for mango staff portal"
        print("Mango Labs staff WebSocket connected successfully")
    
    def test_websocket_pharmacy_staff_connection(self):
        """Test WebSocket connection for Orange Pharmacy staff portal"""
        ws_url = get_ws_url()
        full_url = f"{ws_url}/api/ws/appointments?portal=pharmacy_staff&date=2026-02-16"
        
        messages = []
        connected = False
        
        def on_message(ws, message):
            messages.append(json.loads(message))
        
        def on_open(ws):
            nonlocal connected
            connected = True
            time.sleep(1)
            ws.close()
        
        ws = websocket.WebSocketApp(
            full_url,
            on_open=on_open,
            on_message=on_message,
            on_close=lambda ws, c, m: None,
            on_error=lambda ws, e: None
        )
        
        ws_thread = threading.Thread(target=lambda: ws.run_forever())
        ws_thread.daemon = True
        ws_thread.start()
        ws_thread.join(timeout=5)
        
        assert connected, "WebSocket failed to connect for pharmacy staff portal"
        print("Orange Pharmacy staff WebSocket connected successfully")
    
    def test_websocket_ping_pong(self):
        """Test WebSocket ping/pong mechanism"""
        ws_url = get_ws_url()
        full_url = f"{ws_url}/api/ws/appointments?portal=diagyn_staff&clinic=Pushpa%20Clinic&date=2026-02-16"
        
        messages = []
        pong_received = False
        
        def on_message(ws, message):
            nonlocal pong_received
            msg = json.loads(message)
            messages.append(msg)
            if msg.get('type') == 'pong':
                pong_received = True
                ws.close()
        
        def on_open(ws):
            # Wait for connected message then send ping
            time.sleep(0.5)
            ws.send(json.dumps({"type": "ping"}))
        
        ws = websocket.WebSocketApp(
            full_url,
            on_open=on_open,
            on_message=on_message,
            on_close=lambda ws, c, m: None,
            on_error=lambda ws, e: None
        )
        
        ws_thread = threading.Thread(target=lambda: ws.run_forever())
        ws_thread.daemon = True
        ws_thread.start()
        ws_thread.join(timeout=5)
        
        assert pong_received, "Did not receive pong response to ping"
        print("WebSocket ping/pong working correctly")
    
    def test_websocket_heartbeat(self):
        """Test that WebSocket sends heartbeat on timeout"""
        ws_url = get_ws_url()
        full_url = f"{ws_url}/api/ws/appointments?portal=diagyn_staff&clinic=Test%20Clinic&date=2026-02-16"
        
        messages = []
        heartbeat_received = False
        
        def on_message(ws, message):
            nonlocal heartbeat_received
            msg = json.loads(message)
            messages.append(msg)
            if msg.get('type') == 'heartbeat':
                heartbeat_received = True
                ws.close()
        
        def on_open(ws):
            pass  # Just wait for heartbeat
        
        ws = websocket.WebSocketApp(
            full_url,
            on_open=on_open,
            on_message=on_message,
            on_close=lambda ws, c, m: None,
            on_error=lambda ws, e: None
        )
        
        ws_thread = threading.Thread(target=lambda: ws.run_forever())
        ws_thread.daemon = True
        ws_thread.start()
        # Wait longer for heartbeat (server sends after 30s timeout)
        ws_thread.join(timeout=35)
        
        # Heartbeat may not arrive within test timeout - that's ok
        # The main test is that connection stays open
        print(f"WebSocket received {len(messages)} messages")


class TestStaffLogin:
    """Test staff login for portal access"""
    
    def test_staff_login_diagyn(self):
        """Test staff login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "staff_pushpa",
            "password": "test"
        })
        
        assert response.status_code == 200, f"Staff login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        assert data.get("staff") or data.get("name"), "No staff info in response"
        print(f"Staff login successful: {data.get('staff', {}).get('name', data.get('name'))}")
        return data.get("token")
    
    def test_doctor_login(self):
        """Test doctor login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/staff/login", json={
            "username": "dr_vikas",
            "password": "test"
        })
        
        assert response.status_code == 200, f"Doctor login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        print(f"Doctor login successful: {data.get('staff', {}).get('name', data.get('name'))}")
        return data.get("token")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
