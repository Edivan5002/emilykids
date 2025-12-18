#!/usr/bin/env python3
"""
Check what actions are being used in endpoints vs permissions
"""

import requests
import re

BACKEND_URL = "https://mongo-fastapi-1.preview.emergentagent.com/api"

def check_actions():
    # Login as admin
    admin_login = {"email": "admin@emilykids.com", "senha": "admin123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login)
    if response.status_code != 200:
        print("❌ Admin login failed")
        return
    
    admin_token = response.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Get all permissions
    response = requests.get(f"{BACKEND_URL}/permissions", headers=headers)
    if response.status_code == 200:
        permissions = response.json()
        
        # Get unique actions in permissions
        permission_actions = set()
        for perm in permissions:
            permission_actions.add(perm['acao'])
        
        print("Actions in Permissions Database:")
        print(sorted(permission_actions))
    
    # Read server.py to find what actions are being requested
    with open('/app/backend/server.py', 'r') as f:
        content = f.read()
    
    # Find all require_permission calls
    pattern = r'require_permission\("([^"]+)", "([^"]+)"\)'
    matches = re.findall(pattern, content)
    
    endpoint_actions = set()
    for module, action in matches:
        endpoint_actions.add(action)
    
    print("\nActions requested in endpoints:")
    print(sorted(endpoint_actions))
    
    print("\nMismatches:")
    print("In endpoints but not in permissions:", endpoint_actions - permission_actions)
    print("In permissions but not in endpoints:", permission_actions - endpoint_actions)

if __name__ == "__main__":
    check_actions()