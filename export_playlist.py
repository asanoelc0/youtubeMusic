import argparse

import pandas as pd

from auth import get_youtube_service


def fetch_items(youtube, playlist_id):
    items = []
    position = 0
    request = youtube.playlistItems().list(
        part="snippet,contentDetails", playlistId=playlist_id, maxResults=50
    )
    while request:
        response = request.execute()
        for item in response.get("items", []):
            snippet = item["snippet"]
            items.append(
                {
                    "order": position,
                    "title": snippet["title"],
                    "channel": snippet.get("videoOwnerChannelTitle", ""),
                    "videoId": item["contentDetails"]["videoId"],
                    "playlistItemId": item["id"],
                }
            )
            position += 1
        request = youtube.playlistItems().list_next(request, response)
    return items


def main():
    parser = argparse.ArgumentParser(description="YouTube Musicプレイリストをファイルに出力します")
    parser.add_argument("playlist_id", help="list_playlists.py で確認したプレイリストID")
    parser.add_argument("output", help="出力ファイル名 (.csv または .xlsx)")
    args = parser.parse_args()

    youtube = get_youtube_service()
    items = fetch_items(youtube, args.playlist_id)
    df = pd.DataFrame(items)

    if args.output.endswith(".xlsx"):
        df.to_excel(args.output, index=False)
    else:
        df.to_csv(args.output, index=False, encoding="utf-8-sig")

    print(f"{len(items)} 件のトラックを {args.output} に出力しました。")
    print("Excel やテキストエディタで行を並び替えて保存し、import_playlist.py で反映してください。")
    print("(order列の数値は使いません。ファイル内の行の並び順がそのまま新しい曲順になります)")


if __name__ == "__main__":
    main()
