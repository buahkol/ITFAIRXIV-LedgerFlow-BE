-- db_setup.sql
-- Skema Database LedgerFlow

CREATE DATABASE IF NOT EXISTS ledgerflowdb;
USE ledgerflowdb;

-- Tabel FinancialAccounts
CREATE TABLE IF NOT EXISTS FinancialAccounts (
    account_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    provider_name VARCHAR(50) NOT NULL,
    current_balance DECIMAL(15, 2) NOT NULL
);

-- Tabel Transactions_Ledger (Immutable/Ledger Layer)
CREATE TABLE IF NOT EXISTS Transactions_Ledger (
    ledger_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    original_amount DECIMAL(15, 2) NOT NULL,
    original_date DATETIME NOT NULL,
    original_description VARCHAR(255),
    transaction_type ENUM('IN', 'OUT') NOT NULL,
    blockchain_hash CHAR(64) UNIQUE NOT NULL,
    FOREIGN KEY (account_id) REFERENCES FinancialAccounts(account_id)
);

-- Tabel Transactions_User (Mutable/User Layer)
CREATE TABLE IF NOT EXISTS Transactions_User (
    user_transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    ledger_id INT UNIQUE NOT NULL,
    user_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    status ENUM('Confirmed', 'Pending', 'Cancelled') DEFAULT 'Confirmed',
    FOREIGN KEY (ledger_id) REFERENCES Transactions_Ledger(ledger_id)
);

-- Tabel BudgetSettings
CREATE TABLE IF NOT EXISTS BudgetSettings (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category VARCHAR(100) NOT NULL,
    limit_amount DECIMAL(15, 2) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    UNIQUE KEY unique_monthly_budget (user_id, category, start_date)
);

-- Tabel Categories
CREATE TABLE IF NOT EXISTS Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    is_custom BOOLEAN DEFAULT FALSE
);

-- Seeding Data Awal (Wajib ada 1 akun untuk user 1)
INSERT INTO FinancialAccounts (account_id, user_id, account_type, provider_name, current_balance)
VALUES (1, 1, 'Checking', 'Bank Central', 0.00)
ON DUPLICATE KEY UPDATE current_balance=0.00;

