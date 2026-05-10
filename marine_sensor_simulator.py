import paho.mqtt.client as mqtt
import time
import json
import random
import math

BROKER = "localhost"
PORT = 1883
VESSEL_ID = "V001"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("Connected to MQTT Broker!")
    else:
        print("Failed to connect, return code %d\n", rc)

client = mqtt.Client()
client.on_connect = on_connect

client.connect(BROKER, PORT, 60)
client.loop_start()

tick = 0
try:
    print(f"Starting simulated payload injection for {VESSEL_ID}...")
    while True:
        now = int(time.time() * 1000)
        
        # GNSS Payload
        gnss_payload = {
            "latitude": 18.9220 + math.sin(tick / 10) * 0.001,
            "longitude": 72.8347 + math.cos(tick / 10) * 0.001,
            "heading": (90.0 + tick) % 360,
            "speed": 7.5 + random.uniform(-0.5, 0.5),
            "satellites": random.randint(8, 12),
            "hdop": round(random.uniform(0.8, 1.5), 1),
            "fixType": "DGPS",
            "status": "active",
            "timestamp": now
        }
        client.publish(f"vessel/{VESSEL_ID}/gnss", json.dumps(gnss_payload))
        
        # Thruster Payload (with fin control)
        thruster_payload = {
            "rpm": 1500 + random.randint(-50, 50),
            "power": 85.0 + random.uniform(-2, 2),
            "temperature": 65.0 + random.uniform(-1, 1),
            "thrust": 100.0,
            "voltage": 48.0,
            "currentDraw": 15.0,
            "powerConsumption": 720.0,
            "efficiency": 94.5,
            "vibration": 0.5,
            "fuelFlow": 12.0,
            "runtimeHours": 100,
            "runtimeMinutes": 45,
            "status": "active",
            "fins": {
                "fore": math.sin(tick / 5) * 20,
                "aft": math.cos(tick / 5) * 20,
                "port": math.sin(tick / 8) * 15,
                "stbd": math.cos(tick / 8) * 15
            }
        }
        client.publish(f"vessel/{VESSEL_ID}/thruster", json.dumps(thruster_payload))

        # CTD Payload
        ctd_payload = {
            "depth": 50.0 + math.sin(tick / 10) * 5,
            "temperature": 15.0 + random.uniform(-0.5, 0.5),
            "salinity": 35.0,
            "conductivity": 42.0,
            "pressure": 5.0,
            "status": "active"
        }
        client.publish(f"vessel/{VESSEL_ID}/ctd", json.dumps(ctd_payload))

        # Current Meter Payload
        current_payload = {
            "speed": 1.2 + random.uniform(-0.1, 0.1),
            "direction": (180.0 + tick) % 360,
            "eastward": 0.5,
            "northward": 0.5,
            "upward": 0.0,
            "waterTemperature": 14.5,
            "salinity": 35.0,
            "turbidity": 2.0,
            "status": "active"
        }
        client.publish(f"vessel/{VESSEL_ID}/currentMeter", json.dumps(current_payload))
        
        tick += 1
        time.sleep(1)

except KeyboardInterrupt:
    print("Stopping simulator...")
    client.loop_stop()
    client.disconnect()
