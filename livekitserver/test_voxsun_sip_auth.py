#!/usr/bin/env python3
"""
VoxSun SIP Authentication Diagnostic Tool
==========================================
Tests SIP connectivity and authentication DIRECTLY against VoxSun,
completely bypassing LiveKit. This isolates whether the problem is:
  1. Wrong credentials (username/password)
  2. Wrong domain/address
  3. Network/firewall blocking UDP 5060
  4. VoxSun account misconfiguration

Usage:
  python3 test_voxsun_sip_auth.py
  
  # Or with custom credentials:
  python3 test_voxsun_sip_auth.py --username "user@voxsun.com" --password "pass" --domain "voxsun.net" --port 5060
"""

import socket
import hashlib
import re
import argparse
import sys
import time
import uuid


def generate_call_id():
    return str(uuid.uuid4())


def generate_branch():
    return f"z9hG4bK-{uuid.uuid4().hex[:12]}"


def generate_tag():
    return uuid.uuid4().hex[:8]


def test_dns_resolution(domain: str):
    """Test 1: Can we resolve the SIP domain?"""
    print(f"\n{'='*60}")
    print(f"TEST 1: DNS Resolution for '{domain}'")
    print(f"{'='*60}")
    try:
        ips = socket.getaddrinfo(domain, None)
        unique_ips = set(addr[4][0] for addr in ips)
        print(f"  ✅ Resolved to: {', '.join(unique_ips)}")
        return list(unique_ips)[0]
    except socket.gaierror as e:
        print(f"  ❌ DNS resolution FAILED: {e}")
        print(f"  → The domain '{domain}' cannot be resolved. Check if it's correct.")
        return None


def test_udp_connectivity(ip: str, port: int):
    """Test 2: Can we reach the SIP server on UDP?"""
    print(f"\n{'='*60}")
    print(f"TEST 2: UDP Connectivity to {ip}:{port}")
    print(f"{'='*60}")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(5)
    
    # Send a SIP OPTIONS request (lightweight ping)
    branch = generate_branch()
    call_id = generate_call_id()
    tag = generate_tag()
    
    options_msg = (
        f"OPTIONS sip:{ip}:{port} SIP/2.0\r\n"
        f"Via: SIP/2.0/UDP 0.0.0.0:5060;branch={branch}\r\n"
        f"From: <sip:test@test.local>;tag={tag}\r\n"
        f"To: <sip:{ip}:{port}>\r\n"
        f"Call-ID: {call_id}\r\n"
        f"CSeq: 1 OPTIONS\r\n"
        f"Max-Forwards: 70\r\n"
        f"Content-Length: 0\r\n"
        f"\r\n"
    )
    
    try:
        sock.sendto(options_msg.encode(), (ip, port))
        print(f"  📤 Sent SIP OPTIONS to {ip}:{port}")
        
        data, addr = sock.recvfrom(4096)
        response = data.decode('utf-8', errors='replace')
        first_line = response.split('\r\n')[0]
        print(f"  📥 Received: {first_line}")
        
        if '200' in first_line or '401' in first_line or '407' in first_line:
            print(f"  ✅ SIP server is REACHABLE and responding")
        else:
            print(f"  ⚠️ Got response but unexpected status: {first_line}")
        
        sock.close()
        return True, response
    except socket.timeout:
        print(f"  ❌ TIMEOUT - No response from {ip}:{port}")
        print(f"  → Either the server is down, or UDP port {port} is firewalled")
        print(f"  → Check if your hosting provider allows outbound UDP to port {port}")
        sock.close()
        return False, None
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        sock.close()
        return False, None


def test_tcp_connectivity(ip: str, port: int):
    """Test 2b: Can we reach the SIP server on TCP?"""
    print(f"\n{'='*60}")
    print(f"TEST 2b: TCP Connectivity to {ip}:{port}")
    print(f"{'='*60}")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    
    try:
        sock.connect((ip, port))
        print(f"  ✅ TCP connection to {ip}:{port} SUCCEEDED")
        sock.close()
        return True
    except socket.timeout:
        print(f"  ❌ TCP TIMEOUT - Port {port} may be firewalled")
        sock.close()
        return False
    except ConnectionRefusedError:
        print(f"  ❌ TCP Connection REFUSED - Server not listening on TCP:{port}")
        sock.close()
        return False
    except Exception as e:
        print(f"  ❌ TCP ERROR: {e}")
        sock.close()
        return False


def compute_digest_response(username, password, realm, nonce, uri, method="REGISTER"):
    """Compute SIP Digest Authentication response (RFC 2617)"""
    ha1 = hashlib.md5(f"{username}:{realm}:{password}".encode()).hexdigest()
    ha2 = hashlib.md5(f"{method}:{uri}".encode()).hexdigest()
    response = hashlib.md5(f"{ha1}:{nonce}:{ha2}".encode()).hexdigest()
    return ha1, ha2, response


def test_sip_register(ip: str, port: int, domain: str, username: str, password: str):
    """Test 3: Try to REGISTER with the SIP server (full auth test)"""
    print(f"\n{'='*60}")
    print(f"TEST 3: SIP REGISTER Authentication")
    print(f"{'='*60}")
    print(f"  Domain: {domain}")
    print(f"  Username: {username}")
    print(f"  Password: {'*' * len(password)}")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(10)
    
    branch = generate_branch()
    call_id = generate_call_id()
    tag = generate_tag()
    uri = f"sip:{domain}"

    local_ip = "0.0.0.0"
    local_port = 5060
    
    # Step 1: Send initial REGISTER (expect 401 with nonce)
    register_msg = (
        f"REGISTER sip:{domain} SIP/2.0\r\n"
        f"Via: SIP/2.0/UDP {local_ip}:{local_port};branch={branch}\r\n"
        f"From: <sip:{username}@{domain}>;tag={tag}\r\n"
        f"To: <sip:{username}@{domain}>\r\n"
        f"Call-ID: {call_id}\r\n"
        f"CSeq: 1 REGISTER\r\n"
        f"Contact: <sip:{username}@{local_ip}:{local_port}>\r\n"
        f"Max-Forwards: 70\r\n"
        f"Expires: 3600\r\n"
        f"Content-Length: 0\r\n"
        f"\r\n"
    )
    
    try:
        sock.sendto(register_msg.encode(), (ip, port))
        print(f"\n  📤 Step 1: Sent initial REGISTER (no auth)")
        
        data, addr = sock.recvfrom(4096)
        response = data.decode('utf-8', errors='replace')
        first_line = response.split('\r\n')[0]
        print(f"  📥 Response: {first_line}")
        
        if '401' in first_line or '407' in first_line:
            print(f"  ✅ Server sent auth challenge (expected)")
            
            # Parse WWW-Authenticate header
            realm_match = re.search(r'realm="([^"]+)"', response)
            nonce_match = re.search(r'nonce="([^"]+)"', response)
            
            if not realm_match or not nonce_match:
                print(f"  ❌ Could not parse auth challenge from response")
                print(f"  Response headers:\n{response[:500]}")
                sock.close()
                return False
            
            realm = realm_match.group(1)
            nonce = nonce_match.group(1)
            print(f"  📋 Realm: {realm}")
            print(f"  📋 Nonce: {nonce[:20]}...")
            
            # Step 2: Send REGISTER with auth
            ha1, ha2, digest_response = compute_digest_response(
                username, password, realm, nonce, uri, "REGISTER"
            )
            print(f"\n  🔐 Computing digest auth:")
            print(f"     HA1 = MD5({username}:{realm}:<password>) = {ha1[:16]}...")
            print(f"     HA2 = MD5(REGISTER:{uri}) = {ha2[:16]}...")
            print(f"     Response = MD5({ha1[:8]}...:{nonce[:8]}...:{ha2[:8]}...) = {digest_response[:16]}...")
            
            branch2 = generate_branch()
            
            auth_register_msg = (
                f"REGISTER sip:{domain} SIP/2.0\r\n"
                f"Via: SIP/2.0/UDP {local_ip}:{local_port};branch={branch2}\r\n"
                f"From: <sip:{username}@{domain}>;tag={tag}\r\n"
                f"To: <sip:{username}@{domain}>\r\n"
                f"Call-ID: {call_id}\r\n"
                f"CSeq: 2 REGISTER\r\n"
                f"Contact: <sip:{username}@{local_ip}:{local_port}>\r\n"
                f"Max-Forwards: 70\r\n"
                f"Expires: 3600\r\n"
                f'Authorization: Digest username="{username}", realm="{realm}", '
                f'nonce="{nonce}", uri="{uri}", response="{digest_response}", algorithm=MD5\r\n'
                f"Content-Length: 0\r\n"
                f"\r\n"
            )
            
            sock.sendto(auth_register_msg.encode(), (ip, port))
            print(f"\n  📤 Step 2: Sent REGISTER with digest auth")
            
            # Read multiple packets - server may send OPTIONS qualify check
            # before/alongside the 200 OK on successful registration
            max_reads = 5
            got_200 = False
            got_401 = False
            got_options = False
            
            for i in range(max_reads):
                try:
                    data2, addr2 = sock.recvfrom(4096)
                    response2 = data2.decode('utf-8', errors='replace')
                    first_line2 = response2.split('\r\n')[0]
                    print(f"  📥 Packet {i+1}: {first_line2}")
                    
                    if first_line2.startswith('OPTIONS '):
                        got_options = True
                        print(f"  ℹ️  Server sent OPTIONS qualify check (sign of successful registration)")
                        # Send 200 OK response to the OPTIONS
                        via_match = re.search(r'Via: (.+?)(\r\n)', response2)
                        via_header = via_match.group(1) if via_match else f"SIP/2.0/UDP {ip}:{port};branch={generate_branch()}"
                        from_match = re.search(r'From: (.+?)(\r\n)', response2)
                        from_header = from_match.group(1) if from_match else f"<sip:{username}@{ip}>"
                        to_match = re.search(r'To: (.+?)(\r\n)', response2)
                        to_header = to_match.group(1) if to_match else f"<sip:{username}@{ip}>"
                        cid_match = re.search(r'Call-ID: (.+?)(\r\n)', response2)
                        cid_header = cid_match.group(1) if cid_match else generate_call_id()
                        cseq_match = re.search(r'CSeq: (.+?)(\r\n)', response2)
                        cseq_header = cseq_match.group(1) if cseq_match else "1 OPTIONS"
                        
                        options_reply = (
                            f"SIP/2.0 200 OK\r\n"
                            f"Via: {via_header}\r\n"
                            f"From: {from_header}\r\n"
                            f"To: {to_header};tag={generate_tag()}\r\n"
                            f"Call-ID: {cid_header}\r\n"
                            f"CSeq: {cseq_header}\r\n"
                            f"Content-Length: 0\r\n"
                            f"\r\n"
                        )
                        sock.sendto(options_reply.encode(), (ip, port))
                        print(f"  📤 Replied 200 OK to OPTIONS")
                        continue
                    
                    if 'SIP/2.0 200' in first_line2:
                        got_200 = True
                        break
                    elif 'SIP/2.0 401' in first_line2 or 'SIP/2.0 403' in first_line2:
                        got_401 = True
                        break
                except socket.timeout:
                    break
            
            if got_200 or (got_options and not got_401):
                print(f"\n  ✅✅✅ SIP REGISTRATION SUCCESSFUL!")
                if got_options and not got_200:
                    print(f"  ℹ️  (Confirmed via OPTIONS qualify check from server)")
                print(f"  → Credentials are CORRECT")
                print(f"  → The problem is NOT with VoxSun credentials")
                print(f"  → Check LiveKit SIP gateway configuration")
                sock.close()
                return True
            elif got_401:
                print(f"\n  ❌❌❌ SIP AUTHENTICATION FAILED!")
                print(f"  → Username or password is WRONG")
                print(f"  → Or the realm doesn't match (expected realm: {realm})")
                print(f"  → Double-check credentials in VoxSun admin panel")
                
                if '@' in username:
                    user_part = username.split('@')[0]
                    print(f"\n  💡 TIP: Your username contains '@'. Some SIP servers want just '{user_part}' without the domain part.")
                    print(f"     Try with username: {user_part}")
                else:
                    print(f"\n  💡 TIP: Some SIP servers expect the full email format: {username}@{domain}")
                
                sock.close()
                return False
            else:
                print(f"\n  ⚠️ No definitive response received")
                sock.close()
                return False
                
        elif '200' in first_line:
            print(f"  ✅ Server accepted REGISTER without auth (unusual)")
            sock.close()
            return True
        else:
            print(f"  ⚠️ Unexpected response: {first_line}")
            print(f"  Full response:\n{response[:500]}")
            sock.close()
            return False
            
    except socket.timeout:
        print(f"  ❌ TIMEOUT waiting for REGISTER response")
        print(f"  → VoxSun server didn't respond. Check firewall/network.")
        sock.close()
        return False
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        sock.close()
        return False


def test_invite_without_auth(ip: str, port: int, domain: str, from_number: str, to_number: str):
    """Test 4: Try a SIP INVITE to see what error we get"""
    print(f"\n{'='*60}")
    print(f"TEST 4: SIP INVITE Probe (to see error codes)")
    print(f"{'='*60}")
    print(f"  From: {from_number}")
    print(f"  To: {to_number}")
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(10)
    
    branch = generate_branch()
    call_id = generate_call_id()
    tag = generate_tag()
    
    invite_msg = (
        f"INVITE sip:{to_number}@{domain} SIP/2.0\r\n"
        f"Via: SIP/2.0/UDP 0.0.0.0:5060;branch={branch}\r\n"
        f"From: <sip:{from_number}@{domain}>;tag={tag}\r\n"
        f"To: <sip:{to_number}@{domain}>\r\n"
        f"Call-ID: {call_id}\r\n"
        f"CSeq: 1 INVITE\r\n"
        f"Contact: <sip:{from_number}@0.0.0.0:5060>\r\n"
        f"Max-Forwards: 70\r\n"
        f"Content-Length: 0\r\n"
        f"\r\n"
    )
    
    try:
        sock.sendto(invite_msg.encode(), (ip, port))
        print(f"  📤 Sent INVITE (no auth, just probing for error codes)")
        
        # Collect multiple responses (SIP often sends 100 Trying first)
        responses = []
        for _ in range(5):
            try:
                data, addr = sock.recvfrom(4096)
                resp = data.decode('utf-8', errors='replace')
                first_line = resp.split('\r\n')[0]
                responses.append(first_line)
                print(f"  📥 {first_line}")
                
                # If we get a final response, stop
                status_code = first_line.split(' ')[1] if len(first_line.split(' ')) > 1 else ''
                if status_code and int(status_code) >= 400:
                    break
            except socket.timeout:
                break
            except ValueError:
                break
        
        if not responses:
            print(f"  ❌ No response to INVITE")
        else:
            # Send CANCEL to clean up
            cancel_msg = (
                f"CANCEL sip:{to_number}@{domain} SIP/2.0\r\n"
                f"Via: SIP/2.0/UDP 0.0.0.0:5060;branch={branch}\r\n"
                f"From: <sip:{from_number}@{domain}>;tag={tag}\r\n"
                f"To: <sip:{to_number}@{domain}>\r\n"
                f"Call-ID: {call_id}\r\n"
                f"CSeq: 1 CANCEL\r\n"
                f"Content-Length: 0\r\n"
                f"\r\n"
            )
            sock.sendto(cancel_msg.encode(), (ip, port))
        
        sock.close()
    except Exception as e:
        print(f"  ❌ ERROR: {e}")
        sock.close()


def main():
    parser = argparse.ArgumentParser(description='VoxSun SIP Authentication Diagnostic Tool')
    parser.add_argument('--username', default='VoxSunai@voxsun.com', help='SIP username')
    parser.add_argument('--password', default='Azertyuiop@2025', help='SIP password')
    parser.add_argument('--domain', default='voxsun.net', help='SIP domain')
    parser.add_argument('--port', type=int, default=5060, help='SIP port')
    parser.add_argument('--from-number', default='+14384760245', help='Caller number')
    parser.add_argument('--to-number', default='+15146676791', help='Destination number')
    args = parser.parse_args()
    
    print("=" * 60)
    print("  VoxSun SIP Authentication Diagnostic Tool")
    print("=" * 60)
    print(f"  Target: {args.domain}:{args.port}")
    print(f"  Username: {args.username}")
    print(f"  Password: {'*' * len(args.password)}")
    
    # Test 1: DNS
    ip = test_dns_resolution(args.domain)
    if not ip:
        print("\n❌ DIAGNOSIS: Cannot resolve SIP domain. Fix DNS first.")
        sys.exit(1)
    
    # Test 2: UDP connectivity
    udp_ok, options_response = test_udp_connectivity(ip, args.port)
    
    # Test 2b: TCP connectivity
    tcp_ok = test_tcp_connectivity(ip, args.port)
    
    if not udp_ok and not tcp_ok:
        print("\n❌ DIAGNOSIS: Cannot reach VoxSun on either UDP or TCP.")
        print("   → Check firewall rules on your server")
        print("   → Check if VoxSun has IP whitelisting enabled")
        print("   → Contact VoxSun support")
        sys.exit(1)
    
    if not udp_ok and tcp_ok:
        print("\n⚠️ NOTE: TCP works but UDP doesn't. This is common in Docker environments.")
        print("   → Check Docker network configuration for UDP")
        print("   → Ensure UDP port 5060 is open in both directions")
    
    # Test 3: SIP REGISTER
    auth_ok = test_sip_register(ip, args.port, args.domain, args.username, args.password)
    
    # Also try without @ in username if it has one
    if not auth_ok and '@' in args.username:
        user_part = args.username.split('@')[0]
        print(f"\n  🔄 Retrying with username '{user_part}' (without domain)...")
        auth_ok = test_sip_register(ip, args.port, args.domain, user_part, args.password)
    
    # Test 4: INVITE probe
    test_invite_without_auth(ip, args.port, args.domain, args.from_number, args.to_number)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"  SUMMARY")
    print(f"{'='*60}")
    print(f"  DNS Resolution:   {'✅ OK' if ip else '❌ FAILED'}")
    print(f"  UDP Connectivity: {'✅ OK' if udp_ok else '❌ FAILED'}")
    print(f"  TCP Connectivity: {'✅ OK' if tcp_ok else '❌ FAILED'}")
    print(f"  SIP Auth:         {'✅ OK' if auth_ok else '❌ FAILED'}")
    
    if auth_ok:
        print(f"\n  ✅ Credentials are VALID. Problem is in LiveKit SIP gateway config.")
        print(f"  → Possible causes:")
        print(f"     1. LiveKit SIP gateway can't reach VoxSun (Docker networking)")
        print(f"     2. LiveKit is using wrong transport (TCP vs UDP)")
        print(f"     3. LiveKit SIP gateway needs network access to voxsun.net:5060/UDP")
    else:
        print(f"\n  ❌ Credentials are INVALID or server is unreachable.")
        print(f"  → Actions:")
        print(f"     1. Log into VoxSun admin panel and verify username/password")
        print(f"     2. Check if account is active and not suspended")
        print(f"     3. Contact VoxSun support to confirm SIP credentials")


if __name__ == "__main__":
    main()
