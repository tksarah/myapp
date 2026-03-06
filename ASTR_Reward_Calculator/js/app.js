// ========================
// ASTR Reward Tax Calculator
// Main Application Logic
// ========================

class ASTRRewardCalculator {
    constructor() {
        this.data = [];
        this.editingId = null;
        this.storageKey = 'astr_reward_data';
        this.init();
    }

    // ========================
    // 初期化
    // ========================

    init() {
        // データを読み込む
        this.loadFromStorage();

        // 今日の日付をデフォルトに設定
        document.getElementById('date').valueAsDate = new Date();

        // イベントリスナーの設定
        this.setupEventListeners();

        // 初期表示
        this.render();
    }

    // ========================
    // イベントリスナー
    // ========================

    setupEventListeners() {
        // フォーム送信
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });

        // エクスポート
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportToJSON());

        // インポート
        document.getElementById('importJsonBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleImport(e));

        // データ削除
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllData());
    }

    // ========================
    // フォーム入力処理
    // ========================

    getFormData() {
        const date = document.getElementById('date').value;
        const astrAmount = parseFloat(document.getElementById('astrAmount').value);
        const exchangeRate = parseFloat(document.getElementById('exchangeRate').value);
        const astrPrice = parseFloat(document.getElementById('astrPrice').value);
        const fee = parseFloat(document.getElementById('fee').value) || 0;

        // バリデーション
        if (!date || isNaN(astrAmount) || isNaN(exchangeRate) || isNaN(astrPrice)) {
            this.showAlert('すべての必須項目を入力してください。', 'danger');
            return null;
        }

        if (astrAmount <= 0 || exchangeRate <= 0 || astrPrice <= 0) {
            this.showAlert('数値は0より大きい値を入力してください。', 'danger');
            return null;
        }

        if (fee < 0) {
            this.showAlert('Feeは0以上の値を入力してください。', 'danger');
            return null;
        }

        return {
            date,
            astrAmount,
            exchangeRate,
            astrPrice,
            fee,
        };
    }

    handleFormSubmit() {
        const formData = this.getFormData();
        if (!formData) return;

        if (this.editingId !== null) {
            // 編集モード
            this.updateEntry(this.editingId, formData);
            this.editingId = null;
            document.getElementById('submitBtnText').textContent = '➕ 追加';
        } else {
            // 新規追加モード
            this.addEntry(formData);
        }

        this.clearForm();
        this.saveToStorage();
        this.render();
    }

    clearForm() {
        document.getElementById('entryForm').reset();
        document.getElementById('date').valueAsDate = new Date();
    }

    // ========================
    // データ操作
    // ========================

    addEntry(data) {
        const entry = {
            id: this.generateId(),
            date: data.date,
            astrAmount: data.astrAmount,
            exchangeRate: data.exchangeRate,
            astrPrice: data.astrPrice,
            fee: data.fee,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        this.data.push(entry);
        this.showAlert(`✅ リワード情報を追加しました。`, 'success');
    }

    updateEntry(id, data) {
        const index = this.data.findIndex(e => e.id === id);
        if (index !== -1) {
            this.data[index] = {
                ...this.data[index],
                ...data,
                updatedAt: new Date().toISOString(),
            };
            this.showAlert(`✏️ リワード情報を更新しました。`, 'success');
        }
    }

    deleteEntry(id) {
        const index = this.data.findIndex(e => e.id === id);
        if (index !== -1) {
            this.data.splice(index, 1);
            this.saveToStorage();
            this.render();
            this.showAlert(`🗑️ リワード情報を削除しました。`, 'info');
        }
    }

    editEntry(id) {
        const entry = this.data.find(e => e.id === id);
        if (entry) {
            document.getElementById('date').value = entry.date;
            document.getElementById('astrAmount').value = entry.astrAmount;
            document.getElementById('exchangeRate').value = entry.exchangeRate;
            document.getElementById('astrPrice').value = entry.astrPrice;
            document.getElementById('fee').value = entry.fee;

            this.editingId = id;
            document.getElementById('submitBtnText').textContent = '✏️ 更新';

            // フォームにスクロール
            document.getElementById('entryForm').scrollIntoView({ behavior: 'smooth' });
        }
    }

    // ========================
    // 計算ロジック
    // ========================

    calculateEntry(entry) {
        const rewardUSD = entry.astrAmount * entry.astrPrice;
        const rewardJPY = rewardUSD * entry.exchangeRate;
        const profitUSD = (entry.astrAmount - entry.fee) * entry.astrPrice;
        const profitJPY = profitUSD * entry.exchangeRate;
        const feeUSD = entry.fee * entry.astrPrice;
        const feeJPY = feeUSD * entry.exchangeRate;

        return {
            rewardUSD,
            rewardJPY,
            profitUSD,
            profitJPY,
            feeUSD,
            feeJPY,
        };
    }

    calculateTotals() {
        let totalCount = 0;
        let totalAstr = 0;
        let totalFee = 0;
        let totalFeeJPY = 0;
        let totalRewardUSD = 0;
        let totalRewardJPY = 0;

        this.data.forEach(entry => {
            const calc = this.calculateEntry(entry);
            totalCount += 1;
            totalAstr += entry.astrAmount;
            totalFee += entry.fee;
            totalFeeJPY += calc.feeJPY;
            totalRewardUSD += calc.rewardUSD;
            totalRewardJPY += calc.rewardJPY;
        });

        // 最終損益額 = 総リワード（JPY） - 総Fee（JPY）
        const netProfitJPY = totalRewardJPY - totalFeeJPY;

        return {
            totalCount,
            totalAstr,
            totalFee,
            totalFeeJPY,
            totalRewardUSD,
            totalRewardJPY,
            netProfitJPY,
        };
    }

    // ========================
    // レンダリング
    // ========================

    render() {
        this.renderSummary();
        this.renderTable();
    }

    renderSummary() {
        const totals = this.calculateTotals();

        document.getElementById('totalCount').textContent = totals.totalCount;
        document.getElementById('totalAstr').textContent = this.formatNumber(totals.totalAstr, 2);
        document.getElementById('totalFee').textContent = this.formatNumber(totals.totalFee, 5);
        document.getElementById('totalFeeJpy').textContent = '¥' + this.formatCurrency(totals.totalFeeJPY, 2);
        document.getElementById('totalRewardUsd').textContent = '$' + this.formatCurrency(totals.totalRewardUSD);
        document.getElementById('totalRewardJpy').textContent = '¥' + this.formatCurrency(totals.totalRewardJPY, 0);
        document.getElementById('netProfitJpy').textContent = '¥' + this.formatCurrency(totals.netProfitJPY, 0);
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');

        if (this.data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        データがありません。リワード情報を追加してください。
                    </td>
                </tr>
            `;
            return;
        }

        // 日付でソート（新しい順）
        const sorted = [...this.data].sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = sorted.map(entry => {
            const calc = this.calculateEntry(entry);
            const dateObj = new Date(entry.date);
            const formattedDate = dateObj.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });

            return `
                <tr>
                    <td><strong>${formattedDate}</strong></td>
                    <td class="text-end">${this.formatNumber(entry.astrAmount, 4)}</td>
                    <td class="text-end">$${this.formatCurrency(calc.rewardUSD)}</td>
                    <td class="text-end">¥${this.formatCurrency(calc.rewardJPY, 0)}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="app.editEntry('${entry.id}')">
                            編集
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteEntry('${entry.id}')">
                            削除
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ========================
    // ストレージ操作
    // ========================

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            console.log('✅ データをブラウザに保存しました。');
        } catch (error) {
            console.error('❌ ストレージエラー:', error);
            this.showAlert('データの保存に失敗しました。', 'danger');
        }
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.data = JSON.parse(stored);
                console.log(`✅ ${this.data.length} 件のデータを読み込みました。`);
            }
        } catch (error) {
            console.error('❌ ストレージ読み込みエラー:', error);
            this.data = [];
        }
    }

    // ========================
    // エクスポート機能
    // ========================

    exportToCSV() {
        if (this.data.length === 0) {
            this.showAlert('エクスポートするデータがありません。', 'warning');
            return;
        }

        const totals = this.calculateTotals();
        let csv = 'ASTR Reward Tax Calculator - データエクスポート\n';
        csv += `エクスポート日時: ${new Date().toLocaleString('ja-JP')}\n\n`;

        // ヘッダー
        csv += '日付,ASTR量,ドル円レート,ASTRレート(USD),Fee,リワード(USD),リワード(JPY),利益(USD),利益(JPY)\n';

        // データ行
        this.data.forEach(entry => {
            const calc = this.calculateEntry(entry);
            const dateObj = new Date(entry.date);
            const formattedDate = dateObj.toLocaleDateString('ja-JP');

            csv += `${formattedDate},${entry.astrAmount},${entry.exchangeRate},${entry.astrPrice},${entry.fee},"${calc.rewardUSD.toFixed(2)}","${calc.rewardJPY.toFixed(0)}","${calc.profitUSD.toFixed(2)}","${calc.profitJPY.toFixed(0)}"\n`;
        });

        // 集計行
        csv += '\n集計\n';
        csv += `総Claim数,${totals.totalCount}\n`;
        csv += `合計ASTR量,${totals.totalAstr.toFixed(8)}\n`;
        csv += `合計Fee(ASTR),${totals.totalFee.toFixed(8)}\n`;
        csv += `合計Fee(JPY),${totals.totalFeeJPY.toFixed(0)}\n`;
        csv += `総リワード(USD),${totals.totalRewardUSD.toFixed(2)}\n`;
        csv += `総リワード(JPY),${totals.totalRewardJPY.toFixed(0)}\n`;
        csv += `最終損益額(JPY),${totals.netProfitJPY.toFixed(0)}\n`;

        this.downloadFile(csv, 'astr_reward_data.csv', 'text/csv');
        this.showAlert('✅ CSVファイルをダウンロードしました。', 'success');
    }

    exportToJSON() {
        if (this.data.length === 0) {
            this.showAlert('エクスポートするデータがありません。', 'warning');
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0',
            entries: this.data,
            totals: this.calculateTotals(),
        };

        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile(json, 'astr_reward_data.json', 'application/json');
        this.showAlert('✅ JSONファイルをバックアップしました。', 'success');
    }

    downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // ========================
    // データ管理
    // ========================

    clearAllData() {
        if (confirm('⚠️ すべてのデータを削除してもよろしいですか？\n\nこの操作は取り消せません。')) {
            this.data = [];
            this.saveToStorage();
            this.render();
            this.showAlert('🗑️ すべてのデータを削除しました。', 'info');
        }
    }

    // ========================
    // インポート機能
    // ========================

    handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const obj = JSON.parse(e.target.result);
                let entries = [];
                // 過去の形式も考慮
                if (Array.isArray(obj)) {
                    entries = obj;
                } else if (obj.entries && Array.isArray(obj.entries)) {
                    entries = obj.entries;
                } else {
                    throw new Error('不正なJSON形式です');
                }

                const added = this.mergeEntries(entries);
                this.saveToStorage();
                this.render();
                this.showAlert(`📥 ${added} 件のエントリをインポートしました。`, 'success');
            } catch (err) {
                console.error('インポートエラー:', err);
                this.showAlert('❌ JSONの読み込みに失敗しました。形式を確認してください。', 'danger');
            }
        };
        reader.readAsText(file, 'utf-8');

        // 入力をリセット
        event.target.value = '';
    }

    mergeEntries(entries) {
        let addedCount = 0;
        entries.forEach(entry => {
            // 必須フィールドチェック
            if (!entry.id || !entry.date || entry.astrAmount == null) return;
            // 重複判定
            const exists = this.data.find(e => e.id === entry.id);
            if (!exists) {
                this.data.push(entry);
                addedCount += 1;
            }
        });
        return addedCount;
    }

    // ========================
    // ユーティリティ
    // ========================

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    formatNumber(num, decimals = 2) {
        return num.toLocaleString('ja-JP', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    formatCurrency(num, decimals = 2) {
        return num.toLocaleString('ja-JP', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    showAlert(message, type = 'info') {
        // アラートコンテナがなければ作成
        let alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) {
            alertContainer = document.createElement('div');
            alertContainer.id = 'alertContainer';
            alertContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
            `;
            document.body.appendChild(alertContainer);
        }

        // アラート要素を作成
        const alertId = 'alert_' + Date.now();
        const alertEl = document.createElement('div');
        alertEl.id = alertId;
        alertEl.className = `alert alert-${type} alert-dismissible fade show`;
        alertEl.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        alertContainer.appendChild(alertEl);

        // 3秒後に自動削除
        setTimeout(() => {
            const el = document.getElementById(alertId);
            if (el) {
                el.remove();
            }
        }, 3000);
    }
}

// ========================
// アプリケーション起動
// ========================

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new ASTRRewardCalculator();
    console.log('🚀 ASTR Reward Tax Calculator が読み込まれました！');
});
