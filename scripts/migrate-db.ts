/**
 * Database migration script for Kalameh game tables.
 * Run with: npx tsx scripts/migrate-db.ts
 *
 * This adds new tables to the existing WordGenerator database.
 * Existing tables (words_en, words_fa, sessions, etc.) are NOT modified.
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const tables = [
  {
    name: 'games',
    sql: `CREATE TABLE IF NOT EXISTS games (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(6) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      host_player_id INT DEFAULT NULL,
      language ENUM('en', 'fa') NOT NULL DEFAULT 'en',
      max_players INT NOT NULL DEFAULT 4,
      words_per_player INT NOT NULL DEFAULT 5,
      timer_round1 INT NOT NULL DEFAULT 45,
      timer_round2 INT NOT NULL DEFAULT 35,
      timer_round3 INT NOT NULL DEFAULT 30,
      skips_round1 INT NOT NULL DEFAULT 3,
      skips_round2 INT NOT NULL DEFAULT 1,
      skips_round3 INT NOT NULL DEFAULT 0,
      status ENUM('lobby', 'adding_words', 'playing', 'round_results', 'finished') NOT NULL DEFAULT 'lobby',
      current_round INT DEFAULT NULL,
      current_turn_player_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_code (code),
      INDEX idx_status (status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    name: 'game_players',
    sql: `CREATE TABLE IF NOT EXISTS game_players (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_id INT NOT NULL,
      player_name VARCHAR(100) NOT NULL,
      join_order INT NOT NULL,
      team ENUM('A', 'B') NOT NULL,
      is_host BOOLEAN NOT NULL DEFAULT FALSE,
      words_submitted BOOLEAN NOT NULL DEFAULT FALSE,
      is_connected BOOLEAN NOT NULL DEFAULT TRUE,
      socket_id VARCHAR(100) DEFAULT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE KEY unique_game_player (game_id, player_name),
      INDEX idx_game_id (game_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    name: 'game_words',
    sql: `CREATE TABLE IF NOT EXISTS game_words (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_id INT NOT NULL,
      submitted_by_player_id INT NOT NULL,
      word_text VARCHAR(200) NOT NULL,
      source_word_id INT DEFAULT NULL,
      is_custom BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (submitted_by_player_id) REFERENCES game_players(id) ON DELETE CASCADE,
      UNIQUE KEY unique_game_word (game_id, word_text),
      INDEX idx_game_id (game_id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    name: 'round_state',
    sql: `CREATE TABLE IF NOT EXISTS round_state (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_id INT NOT NULL,
      round_number INT NOT NULL,
      status ENUM('pending', 'active', 'completed') NOT NULL DEFAULT 'pending',
      team_a_score INT NOT NULL DEFAULT 0,
      team_b_score INT NOT NULL DEFAULT 0,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE KEY unique_game_round (game_id, round_number)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    name: 'round_words',
    sql: `CREATE TABLE IF NOT EXISTS round_words (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_id INT NOT NULL,
      round_number INT NOT NULL,
      game_word_id INT NOT NULL,
      status ENUM('in_pool', 'guessed') NOT NULL DEFAULT 'in_pool',
      guessed_by_player_id INT DEFAULT NULL,
      guessed_at TIMESTAMP NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (game_word_id) REFERENCES game_words(id) ON DELETE CASCADE,
      INDEX idx_game_round (game_id, round_number),
      INDEX idx_status (status)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
  {
    name: 'turn_log',
    sql: `CREATE TABLE IF NOT EXISTS turn_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      game_id INT NOT NULL,
      round_number INT NOT NULL,
      player_id INT NOT NULL,
      words_correct INT NOT NULL DEFAULT 0,
      words_skipped INT NOT NULL DEFAULT 0,
      timer_duration INT NOT NULL,
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ended_at TIMESTAMP NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES game_players(id) ON DELETE CASCADE,
      INDEX idx_game_round (game_id, round_number)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  },
];

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'wordgenerator',
    charset: 'utf8mb4',
  });

  console.log('Connected to database.\n');

  for (const table of tables) {
    try {
      await connection.execute(table.sql);
      console.log(`  [OK] ${table.name}`);
    } catch (err) {
      console.error(`  [FAIL] ${table.name}:`, err);
    }
  }

  console.log('\nMigration complete.');
  await connection.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
