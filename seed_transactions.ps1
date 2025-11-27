# seed_transactions.ps1
# SCRIPT POWERSHELL UNTUK MENGISI 10 TRANSAKSI DUMMY DAN BUDGET UNTUK UJI COBA

# =========================================================
# 1. SETUP VARIABEL & LOGIN ULANG
# =========================================================
$USER_ID = 1
$BASE_URL = "http://localhost:3000"
Write-Host "## Melakukan Login untuk mendapatkan Token Baru..."

$response = irm -Method Post "$BASE_URL/api/auth/login/$USER_ID"
$TOKEN_JWT = $response.token
$headers = @{"Authorization" = "Bearer $TOKEN_JWT"; "Content-Type" = "application/json"}
Write-Host "Token JWT berhasil didapatkan."

# =========================================================
# 2. SEEDING 10 RIWAYAT TRANSAKSI BARU
# =========================================================
Write-Host "`n## 2. Seeding 10 Riwayat Transaksi..."

# Transaksi 1: (Kredit) Gaji
$tx1 = '{"account_id": 1,"user_id": 1,"amount": 8000000.00,"date": "2025-11-01T08:00:00Z","description": "Transfer Gaji Bulanan"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx1 -Headers @{"Content-Type" = "application/json"}

# Transaksi 2: (Debit) Tagihan Netflix (Auto-categorized: Tagihan)
$tx2 = '{"account_id": 1,"user_id": 1,"amount": -150000.00,"date": "2025-11-02T10:00:00Z","description": "Pembayaran Tagihan Netflix"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx2 -Headers @{"Content-Type" = "application/json"}

# 03. (Debit) Transportasi (Auto: Gojek)
$tx3 = '{"account_id": 1,"user_id": 1,"amount": -35000.00,"date": "2025-11-03T07:30:00Z","description": "Bayar Gojek ke Kantor"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx3 -Headers @{"Content-Type" = "application/json"}

# 04. (Debit) Makanan (Auto: Starbucks)
$tx4 = '{"account_id": 1,"user_id": 1,"amount": -60000.00,"date": "2025-11-03T11:45:00Z","description": "Starbucks Coffee & Snacks"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx4 -Headers @{"Content-Type" = "application/json"}

# 05. (Debit) Belanja (Kategori Uncategorized -> Belanja)
$tx5 = '{"account_id": 1,"user_id": 1,"amount": -450000.00,"date": "2025-11-05T15:00:00Z","description": "Belanja Kebutuhan Bulanan di Minimarket"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx5 -Headers @{"Content-Type" = "application/json"}

# 06. (Debit) Transportasi (Auto: Gojek)
$tx6 = '{"account_id": 1,"user_id": 1,"amount": -40000.00,"date": "2025-11-06T19:00:00Z","description": "Bayar Gojek Pulang"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx6 -Headers @{"Content-Type" = "application/json"}

# 07. (Debit) Makanan (Auto: McD)
$tx7 = '{"account_id": 1,"user_id": 1,"amount": -85000.00,"date": "2025-11-10T19:30:00Z","description": "McDonalds Dinner"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx7 -Headers @{"Content-Type" = "application/json"}

# 08. (Debit) Investasi (Kategori Uncategorized -> Investasi)
$tx8 = '{"account_id": 1,"user_id": 1,"amount": -1000000.00,"date": "2025-11-15T10:00:00Z","description": "Top Up Reksadana"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx8 -Headers @{"Content-Type" = "application/json"}

# 09. (Debit) Hiburan (Kategori Uncategorized -> Bioskop)
$tx9 = '{"account_id": 1,"user_id": 1,"amount": -200000.00,"date": "2025-11-20T18:00:00Z","description": "Pembelian Tiket Bioskop"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx9 -Headers @{"Content-Type" = "application/json"}

# 10. (Debit) Makanan (Auto: Starbucks)
$tx10 = '{"account_id": 1,"user_id": 1,"amount": -55000.00,"date": "2025-11-24T12:00:00Z","description": "Starbucks Lunch"}'
irm -Method Post -Uri "$BASE_URL/api/transactions/ingest-mutation" -Body $tx10 -Headers @{"Content-Type" = "application/json"}

# Setting Budget Baru
Write-Host "`n## 3. Setting Budget Baru & Uji Health Score..."
$budgetBody = @{
    budgets = @(
        @{category="Makanan & Minuman"; limit="500000.00"},
        @{category="Transportasi"; limit="100000.00"},
        @{category="Tagihan"; limit="200000.00"},
        @{category="Belanja"; limit="500000.00"},
        @{category="Hiburan"; limit="300000.00"}
    )
} | ConvertTo-Json
irm -Method Post -Uri "$BASE_URL/api/budget/$USER_ID" -Headers $headers -Body $budgetBody

# Uji Integrasi Akhir
Write-Host "`n## 4. Uji GET Health Score (Verifikasi AI)"
irm -Method Get -Uri "$BASE_URL/api/finance/health/$USER_ID" -Headers $headers
