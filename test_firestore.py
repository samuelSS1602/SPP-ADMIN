import urllib.request
import json

url = "https://firestore.googleapis.com/v1/projects/adminlodge/databases/(default)/documents/test_collection?documentId=test_doc2"
data = json.dumps({"fields": {"status": {"stringValue": "ok"}}}).encode("utf-8")
req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})

try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code, e.read().decode("utf-8"))
except Exception as e:
    print("Exception:", str(e))
