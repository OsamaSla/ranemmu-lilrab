# -*- coding: utf-8 -*-
"""Upload the tutorial video to YouTube (YouTube Data API v3, OAuth desktop flow).

One-time setup:
    1. Google Cloud console -> enable "YouTube Data API v3".
    2. Create an OAuth client of type "Desktop app", download the JSON.
    3. Put it at tutorial/client_secret.json  (or pass --client-secret).
    4. pip install google-api-python-client google-auth-oauthlib google-auth-httplib2

Run:
    python scripts/tutorial/upload_youtube.py --privacy unlisted
    python scripts/tutorial/upload_youtube.py --privacy public --no-patch

The first run opens a browser for consent and caches the token at
tutorial/.youtube-token.json (add it to .gitignore; never commit it).
"""
import argparse
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"]

DEFAULT_TITLE = "دليل استخدام تطبيق رنموا للرب"
DEFAULT_DESC = (
    "شرح مبسّط لأهم ميزات تطبيق رنموا للرب:\n"
    "- اختيار الكتاب والموضوع\n"
    "- البحث عن الترنيمة بالرقم أو بالكلمة\n"
    "- الترجمة بالإنجليزية والألمانية\n"
    "- إعدادات عرض الترنيمة\n\n"
    "حمّل التطبيق وابدأ التسبيح."
)


def get_service(client_secret, token_path):
    creds = None
    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(client_secret):
                raise SystemExit(
                    f"missing OAuth client: {client_secret}\n"
                    "Download a Desktop-app OAuth client from Google Cloud and save it there."
                )
            flow = InstalledAppFlow.from_client_secrets_file(client_secret, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, "w", encoding="utf-8") as f:
            f.write(creds.to_json())
    return build("youtube", "v3", credentials=creds)


def patch_ts(url):
    ts = os.path.join(ROOT, "src", "data", "tutorials.ts")
    src = open(ts, encoding="utf-8").read()
    out = re.sub(r"export const TUTORIAL_YOUTUBE_URL: string = '[^']*';",
                 f"export const TUTORIAL_YOUTUBE_URL: string = '{url}';", src)
    if out == src:
        print("! could not find TUTORIAL_YOUTUBE_URL in src/data/tutorials.ts")
        return False
    open(ts, "w", encoding="utf-8").write(out)
    print("patched src/data/tutorials.ts (TUTORIAL_YOUTUBE_URL)")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default=os.path.join(ROOT, "tutorial", "final.mp4"))
    ap.add_argument("--client-secret", default=os.path.join(ROOT, "tutorial", "client_secret.json"))
    ap.add_argument("--token", default=os.path.join(ROOT, "tutorial", ".youtube-token.json"))
    ap.add_argument("--privacy", choices=["public", "unlisted", "private"], default="unlisted")
    ap.add_argument("--title", default=DEFAULT_TITLE)
    ap.add_argument("--description", default=DEFAULT_DESC)
    ap.add_argument("--tags", default="رنموا للرب,ترانيم,تسبيح,شرح التطبيق,دليل المستخدم")
    ap.add_argument("--category", default="27")  # 27 = Education
    ap.add_argument("--no-patch", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.file):
        raise SystemExit(f"missing video: {args.file}")

    youtube = get_service(args.client_secret, args.token)
    body = {
        "snippet": {
            "title": args.title,
            "description": args.description,
            "tags": [t.strip() for t in args.tags.split(",") if t.strip()],
            "categoryId": args.category,
            "defaultLanguage": "ar",
            "defaultAudioLanguage": "ar",
        },
        "status": {
            "privacyStatus": args.privacy,
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(args.file, mimetype="video/mp4", resumable=True, chunksize=-1)
    req = youtube.videos().insert(part="snippet,status", body=body, media_body=media)

    print(f"uploading {os.path.basename(args.file)} as {args.privacy} ...")
    response = None
    while response is None:
        status, response = req.next_chunk()
        if status:
            print(f"  {int(status.progress() * 100)}%")
    vid = response["id"]
    url = f"https://www.youtube.com/watch?v={vid}"
    print(f"\nuploaded: {url}\n")

    if not args.no_patch:
        patch_ts(url)


if __name__ == "__main__":
    main()
