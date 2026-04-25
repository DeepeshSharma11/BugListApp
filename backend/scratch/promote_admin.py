import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

user_id = "75f93a65-a2d1-446a-9694-6c75dff6f250"

print(f"Updating role to admin for user: {user_id}")
res = sb.table("profiles").update({"role": "admin"}).eq("id", user_id).execute()

if len(res.data) > 0:
    print("✅ Success! User is now an admin.")
else:
    print("❌ Failed to update. Check if user ID is correct.")
