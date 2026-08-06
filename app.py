from flask import Flask, jsonify, render_template, request
from googleapiclient.errors import HttpError

from auth import get_youtube_service

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/playlists")
def api_playlists():
    youtube = get_youtube_service()
    playlists = []
    req = youtube.playlists().list(part="snippet,contentDetails", mine=True, maxResults=50)
    while req:
        response = req.execute()
        for item in response.get("items", []):
            playlists.append(
                {
                    "id": item["id"],
                    "title": item["snippet"]["title"],
                    "count": item["contentDetails"]["itemCount"],
                }
            )
        req = youtube.playlists().list_next(req, response)
    return jsonify(playlists)


@app.route("/api/playlist/<playlist_id>/items")
def api_playlist_items(playlist_id):
    youtube = get_youtube_service()
    items = []
    req = youtube.playlistItems().list(
        part="snippet,contentDetails", playlistId=playlist_id, maxResults=50
    )
    while req:
        response = req.execute()
        for item in response.get("items", []):
            snippet = item["snippet"]
            thumb = snippet.get("thumbnails", {}).get("default", {}).get("url", "")
            items.append(
                {
                    "playlistItemId": item["id"],
                    "videoId": item["contentDetails"]["videoId"],
                    "title": snippet["title"],
                    "channel": snippet.get("videoOwnerChannelTitle", ""),
                    "thumbnail": thumb,
                }
            )
        req = youtube.playlistItems().list_next(req, response)
    return jsonify(items)


@app.route("/api/playlist/<playlist_id>/reorder", methods=["POST"])
def api_reorder(playlist_id):
    youtube = get_youtube_service()
    items = (request.get_json(silent=True) or {}).get("items", [])

    results = []
    for position, item in enumerate(items):
        body = {
            "id": item["playlistItemId"],
            "snippet": {
                "playlistId": playlist_id,
                "position": position,
                "resourceId": {"kind": "youtube#video", "videoId": item["videoId"]},
            },
        }
        try:
            youtube.playlistItems().update(part="snippet", body=body).execute()
            results.append({"playlistItemId": item["playlistItemId"], "ok": True})
        except HttpError as e:
            results.append({"playlistItemId": item["playlistItemId"], "ok": False, "error": str(e)})

    return jsonify(results)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
