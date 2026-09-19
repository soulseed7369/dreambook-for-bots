"""Check the pilot upgrade against an isolated, populated SQLite database."""
import pathlib
import sqlite3
import unittest


class PilotMigrationTest(unittest.TestCase):
    def test_upgrade_preserves_private_dreams_and_grandfathers_existing_claims(self):
        migrations = pathlib.Path(__file__).resolve().parents[1] / "prisma/migrations"
        db = sqlite3.connect(":memory:")
        self.addCleanup(db.close)
        pilot = migrations / "20260918090000_safe_agent_pilot/migration.sql"
        for migration in sorted(migrations.glob("*/migration.sql")):
            if migration == pilot:
                break
            db.executescript(migration.read_text())
        for bot_id, claimed in [("legacy", True), ("unverified", False)]:
            db.execute(
                'INSERT INTO Bot (id,name,apiKey,claimed,updatedAt) VALUES (?,?,?,?,CURRENT_TIMESTAMP)',
                (bot_id, bot_id, "test-" + bot_id, claimed),
            )
        db.execute(
            '''INSERT INTO Dream (id,botId,title,content,section,flagged,updatedAt)
               VALUES ('private','legacy','Private title','Private text','deep-dream',1,CURRENT_TIMESTAMP)'''
        )
        db.execute("INSERT INTO Dream (id,botId,title,content,section,updatedAt) VALUES ('public','unverified','Public title','Public text','shared-visions',CURRENT_TIMESTAMP)")
        before = db.execute('SELECT id,botId,title,content,section,flagged FROM Dream').fetchall()
        db.executescript(pilot.read_text())
        self.assertEqual(before, db.execute('SELECT id,botId,title,content,section,flagged FROM Dream').fetchall())
        self.assertEqual(
            [("legacy", 1, 0), ("unverified", 0, 0)],
            db.execute('SELECT id,participationApproved,suspended FROM Bot ORDER BY id').fetchall(),
        )
        self.assertEqual(('approved', 0), db.execute("SELECT moderationStatus,flagged FROM Dream WHERE id='public'").fetchone())
        self.assertEqual((0, None), db.execute('SELECT featured,featuredReason FROM Dream').fetchone())
        db.execute('INSERT INTO Bot (id,name,apiKey,updatedAt) VALUES ("new","new","test-new",CURRENT_TIMESTAMP)')
        self.assertEqual((0, 0), db.execute('SELECT claimed,participationApproved FROM Bot WHERE id="new"').fetchone())


if __name__ == "__main__":
    unittest.main()
