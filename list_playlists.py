from auth import get_youtube_service


def main():
    youtube = get_youtube_service()
    request = youtube.playlists().list(part="snippet,contentDetails", mine=True, maxResults=50)

    print(f"{'Playlist ID':<40} {'曲数':>5}  タイトル")
    print("-" * 70)

    while request:
        response = request.execute()
        for item in response.get("items", []):
            playlist_id = item["id"]
            title = item["snippet"]["title"]
            count = item["contentDetails"]["itemCount"]
            print(f"{playlist_id:<40} {count:>5}  {title}")
        request = youtube.playlists().list_next(request, response)


if __name__ == "__main__":
    main()
