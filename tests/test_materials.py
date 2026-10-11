from backend.models import connect, get_all_videos, init_db


def test_video_catalog_reuses_only_published_video_news_and_keeps_local_videos(tmp_path):
    database = tmp_path / "materials.sqlite"
    assert init_db(database)
    with connect(database) as conn, conn:
        conn.execute("INSERT INTO videos(title,url) VALUES ('Local','https://example.org/video')")
        for key, category in [('v', 'Видео'), ('m', 'Мемный Понедельник')]:
            conn.execute("""INSERT INTO sheet_news(sheet_key,row_key,title,content,date,source,category)
                VALUES ('s',?,?,'Description','2026-10-01',?,?)""",
                         (key, key, 'https://t.me/physics/' + ('1' if key == 'v' else '2'), category))
    videos = get_all_videos(database)
    assert [row['title'] for row in videos] == ['Local', 'v']
    assert videos[1]['description'] == 'Description'
    with connect(database) as conn, conn:
        conn.execute("DELETE FROM sheet_news WHERE row_key='v'")
    assert [row['title'] for row in get_all_videos(database)] == ['Local']
