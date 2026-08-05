import argparse

import pandas as pd
from googleapiclient.errors import HttpError

from auth import get_youtube_service


def main():
    parser = argparse.ArgumentParser(description="編集済みファイルの並び順をYouTube Musicプレイリストに反映します")
    parser.add_argument("playlist_id", help="list_playlists.py で確認したプレイリストID")
    parser.add_argument("input", help="編集済みファイル (.csv または .xlsx)")
    parser.add_argument("--dry-run", action="store_true", help="実際には更新せず、変更内容だけ表示します")
    args = parser.parse_args()

    if args.input.endswith(".xlsx"):
        df = pd.read_excel(args.input)
    else:
        df = pd.read_csv(args.input)

    required_columns = {"playlistItemId", "videoId"}
    if not required_columns.issubset(df.columns):
        raise SystemExit(
            "入力ファイルに playlistItemId / videoId 列がありません。"
            "export_playlist.py で出力したファイルを編集してください。"
        )

    youtube = get_youtube_service()

    updated = 0
    for position, row in enumerate(df.itertuples(index=False)):
        body = {
            "id": row.playlistItemId,
            "snippet": {
                "playlistId": args.playlist_id,
                "position": position,
                "resourceId": {"kind": "youtube#video", "videoId": row.videoId},
            },
        }

        if args.dry_run:
            print(f"[dry-run] position {position}: {row.title}")
            continue

        try:
            youtube.playlistItems().update(part="snippet", body=body).execute()
            updated += 1
            print(f"position {position}: {row.title}")
        except HttpError as e:
            print(f"エラー: 「{row.title}」の更新に失敗しました: {e}")

    if not args.dry_run:
        print(f"{updated} 件のトラックの並び順を更新しました。")


if __name__ == "__main__":
    main()
