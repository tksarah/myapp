// ========================
// ASTR Reward Tax Calculator
// Main Application Logic
// ========================

class ASTRRewardCalculator {
    constructor() {
        this.data = [];
        this.editingId = null;
        this.appVersion = '1.5.0';
        this.storageKey = 'astr_reward_data';
        this.reportMetadataKey = 'astr_report_metadata';
        // ページング関連
        this.currentPage = 1;
        this.itemsPerPage = 5;
        // ソート関連
        this.sortColumn = 'date';
        this.sortOrder = 'desc'; // 'asc' or 'desc'        // テーマ関連
        this.themeKey = 'astr_theme';
        // チャート関連
        this.monthlyChart = null;
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

        // ソートアイコンを初期化
        this.updateSortIcons();

        // テーマを初期化
        this.initTheme();

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

        document.getElementById('fetchReferenceRateBtn').addEventListener('click', () => {
            this.handleFetchReferenceRate();
        });

        // エクスポート
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportJsonBtn').addEventListener('click', () => this.exportToJSON());
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportToPdfReport());
        document.getElementById('exportReportBtn').addEventListener('click', () => this.exportToPrintReport());
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllData());

        // インポート
        document.getElementById('importJsonBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleImport(e));

        // ソート機能
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', (e) => {
                const column = e.currentTarget.dataset.column;
                this.handleSort(column);
            });
        });

        // テーマ切り替え
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
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

    async handleFetchReferenceRate() {
        const date = document.getElementById('date').value;

        if (!date) {
            this.showAlert('先に日付を入力してください。', 'warning');
            return;
        }

        this.setReferenceRateButtonLoading(true);

        try {
            const [astrResult, fxResult] = await Promise.allSettled([
                this.fetchAstarUsdReferenceRate(date),
                this.fetchUsdJpyReferenceRate(date),
            ]);

            let updatedFields = 0;
            const messages = [];

            if (astrResult.status === 'fulfilled') {
                document.getElementById('astrPrice').value = astrResult.value.toFixed(4);
                updatedFields += 1;
                messages.push(`ASTR/USD: ${astrResult.value.toFixed(4)}`);
            }

            if (fxResult.status === 'fulfilled') {
                document.getElementById('exchangeRate').value = fxResult.value.toFixed(2);
                updatedFields += 1;
                messages.push(`USD/JPY: ${fxResult.value.toFixed(2)}`);
            }

            if (updatedFields === 2) {
                this.showAlert(`✅ 参考レートを取得しました。${messages.join(' / ')}`, 'success');
                return;
            }

            if (updatedFields === 1) {
                this.showAlert(`⚠️ 一部の参考レートのみ取得しました。${messages.join(' / ')}`, 'warning');
                return;
            }

            throw new Error('参考レートを取得できませんでした。');
        } catch (error) {
            console.error('参考レート取得エラー:', error);
            this.showAlert('❌ 参考レートの取得に失敗しました。手入力は引き続き利用できます。', 'danger');
        } finally {
            this.setReferenceRateButtonLoading(false);
        }
    }

    async fetchAstarUsdReferenceRate(date) {
        const formattedDate = this.formatDateForCoinGecko(date);
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/astar/history?date=${formattedDate}&localization=false`);

        if (!response.ok) {
            throw new Error(`ASTRレートの取得に失敗しました: ${response.status}`);
        }

        const data = await response.json();
        const price = data?.market_data?.current_price?.usd;

        if (typeof price !== 'number') {
            throw new Error('ASTR/USD レートがレスポンスに含まれていません。');
        }

        return price;
    }

    async fetchUsdJpyReferenceRate(date) {
        const response = await fetch(`https://api.frankfurter.dev/v1/${date}?base=USD&symbols=JPY`);

        if (!response.ok) {
            throw new Error(`USD/JPY レートの取得に失敗しました: ${response.status}`);
        }

        const data = await response.json();
        const rate = data?.rates?.JPY;

        if (typeof rate !== 'number') {
            throw new Error('USD/JPY レートがレスポンスに含まれていません。');
        }

        return rate;
    }

    formatDateForCoinGecko(date) {
        const [year, month, day] = date.split('-');
        return `${day}-${month}-${year}`;
    }

    setReferenceRateButtonLoading(isLoading) {
        const button = document.getElementById('fetchReferenceRateBtn');
        if (!button) return;

        button.disabled = isLoading;
        button.textContent = isLoading ? '⏳ 参考レート取得中...' : '📡 その日の参考レートを取得';
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
        // 新規追加時は最初のページに戻る
        this.currentPage = 1;
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

            // 現在のページが空になった場合、前のページに戻る
            const totalPages = Math.ceil(this.data.length / this.itemsPerPage);
            if (this.currentPage > totalPages && totalPages > 0) {
                this.currentPage = totalPages;
            }

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

    calculateMonthlyTotals() {
        const monthlyData = {};

        this.data.forEach(entry => {
            const date = new Date(entry.date);
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[yearMonth]) {
                monthlyData[yearMonth] = {
                    totalRewardJPY: 0,
                    totalFeeJPY: 0,
                    netProfitJPY: 0,
                };
            }

            const calc = this.calculateEntry(entry);
            monthlyData[yearMonth].totalRewardJPY += calc.rewardJPY;
            monthlyData[yearMonth].totalFeeJPY += calc.feeJPY;
            monthlyData[yearMonth].netProfitJPY = monthlyData[yearMonth].totalRewardJPY - monthlyData[yearMonth].totalFeeJPY;
        });

        // 年月でソート
        const sortedMonths = Object.keys(monthlyData).sort();

        return sortedMonths.map(month => ({
            month,
            ...monthlyData[month],
        }));
    }

    // ========================
    // レンダリング
    // ========================

    render() {
        this.renderSummary();
        this.renderTable();
        this.renderChart();
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

    renderChart() {
        const monthlyData = this.calculateMonthlyTotals();
        const ctx = document.getElementById('monthlyChart');
        const currentTheme = this.getTheme();

        // 既存のチャートを完全に破棄
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
            this.monthlyChart = null;
        }

        // キャンバスをクリア
        const canvasContext = ctx.getContext('2d');
        canvasContext.clearRect(0, 0, ctx.width, ctx.height);

        if (monthlyData.length === 0) {
            ctx.style.display = 'none';
            return;
        } else {
            ctx.style.display = 'block';
        }

        const labels = monthlyData.map(item => {
            const [year, month] = item.month.split('-');
            return `${year}年${month}月`;
        });

        const data = monthlyData.map(item => item.totalRewardJPY);

        // テーマに応じた色設定
        const isDark = currentTheme === 'dark';
        const barColor = isDark ? 'rgba(25, 135, 84, 0.8)' : 'rgba(40, 167, 69, 0.8)';
        const borderColor = isDark ? 'rgba(25, 135, 84, 1)' : 'rgba(40, 167, 69, 1)';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#ffffff' : '#1a1a1a'; // より濃い黒に変更

        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '合計リワード額 (JPY)',
                    data: data,
                    backgroundColor: barColor,
                    borderColor: borderColor,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // 初期描画時のちらつきを防ぐ
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '¥' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 0 // 初期描画時のちらつきを防ぐ
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '¥' + context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '¥' + value.toLocaleString();
                            },
                            color: textColor,
                            font: {
                                size: 12,
                                weight: '600',
                                color: textColor // より確実に色を設定
                            },
                            padding: 10 // 軸ラベルとチャートの間に余白を追加
                        },
                        grid: {
                            color: gridColor,
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12,
                                weight: '600',
                                color: textColor // より確実に色を設定
                            },
                            padding: 5 // 軸ラベルとチャートの間に余白を追加
                        },
                        grid: {
                            color: gridColor,
                        }
                    }
                }
            }
            }
        });
    }

    renderTable() {
        const tbody = document.getElementById('tableBody');
        const paginationControls = document.getElementById('paginationControls');

        if (this.data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted py-4">
                        データがありません。リワード情報を追加してください。
                    </td>
                </tr>
            `;
            paginationControls.classList.add('d-none');
            return;
        }

        // 日付でソート（新しい順）
        const sorted = this.sortData(this.data);

        // ページング計算
        const totalPages = Math.ceil(sorted.length / this.itemsPerPage);
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = sorted.slice(startIndex, endIndex);

        // ページが範囲外の場合、最初のページに戻す
        if (this.currentPage > totalPages) {
            this.currentPage = 1;
            return this.renderTable();
        }

        // テーブル本体をレンダリング
        tbody.innerHTML = pageData.map((entry, index) => {
            const calc = this.calculateEntry(entry);
            const entryNumber = startIndex + index + 1;

            return `
                <tr>
                    <td><strong>${entryNumber}</strong></td>
                    <td><strong>${this.formatDate(entry.date)}</strong></td>
                    <td class="text-end">${this.formatNumber(entry.astrAmount, 2)}</td>
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

        // ページングコントロールをレンダリング
        this.renderPagination(totalPages);
    }

    renderPagination(totalPages) {
        const paginationControls = document.getElementById('paginationControls');
        const paginationList = document.getElementById('paginationList');

        if (totalPages <= 1) {
            paginationControls.classList.add('d-none');
            return;
        }

        paginationControls.classList.remove('d-none');

        let paginationHtml = '';

        // 前へボタン
        if (this.currentPage > 1) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="app.changePage(${this.currentPage - 1})">« 前へ</a></li>`;
        } else {
            paginationHtml += `<li class="page-item disabled"><span class="page-link">« 前へ</span></li>`;
        }

        // ページ番号ボタン（最大5ページ表示）
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            if (i === this.currentPage) {
                paginationHtml += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                paginationHtml += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="app.changePage(${i})">${i}</a></li>`;
            }
        }

        // 次へボタン
        if (this.currentPage < totalPages) {
            paginationHtml += `<li class="page-item"><a class="page-link" href="javascript:void(0)" onclick="app.changePage(${this.currentPage + 1})">次へ »</a></li>`;
        } else {
            paginationHtml += `<li class="page-item disabled"><span class="page-link">次へ »</span></li>`;
        }

        paginationList.innerHTML = paginationHtml;
    }

    changePage(pageNumber) {
        this.currentPage = pageNumber;
        this.renderTable();
    }

    // ========================
    // ソート機能
    // ========================

    handleSort(column) {
        if (this.sortColumn === column) {
            // 同じ列をクリックしたら順序を反転
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        } else {
            // 異なる列をクリックしたらその列で降順から開始
            this.sortColumn = column;
            this.sortOrder = 'desc';
        }

        // ソートアイコンを更新
        this.updateSortIcons();

        // 最初のページに戻って再レンダリング
        this.currentPage = 1;
        this.renderTable();
    }

    updateSortIcons() {
        // すべてのソートアイコンをリセット
        document.querySelectorAll('.sort-icon').forEach(icon => {
            icon.textContent = '';
        });

        // 現在のソート列のアイコンを設定
        const currentIcon = document.getElementById(`sort-${this.sortColumn}`);
        if (currentIcon) {
            currentIcon.textContent = this.sortOrder === 'asc' ? '▲' : '▼';
        }
    }

    sortData(data) {
        return [...data].sort((a, b) => {
            let valueA, valueB;

            switch (this.sortColumn) {
                case 'date':
                    valueA = new Date(a.date);
                    valueB = new Date(b.date);
                    break;
                case 'astrAmount':
                    valueA = a.astrAmount;
                    valueB = b.astrAmount;
                    break;
                case 'rewardUSD':
                    valueA = this.calculateEntry(a).rewardUSD;
                    valueB = this.calculateEntry(b).rewardUSD;
                    break;
                case 'rewardJPY':
                    valueA = this.calculateEntry(a).rewardJPY;
                    valueB = this.calculateEntry(b).rewardJPY;
                    break;
                default:
                    return 0;
            }

            if (valueA < valueB) {
                return this.sortOrder === 'asc' ? -1 : 1;
            }
            if (valueA > valueB) {
                return this.sortOrder === 'asc' ? 1 : -1;
            }
            return 0;
        });
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

            csv += `${this.formatDate(entry.date)},${entry.astrAmount},${entry.exchangeRate},${entry.astrPrice},${entry.fee},"${calc.rewardUSD.toFixed(2)}","${calc.rewardJPY.toFixed(0)}","${calc.profitUSD.toFixed(2)}","${calc.profitJPY.toFixed(0)}"\n`;
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
            appVersion: this.appVersion,
            entries: this.data,
            totals: this.calculateTotals(),
        };

        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile(json, 'astr_reward_data.json', 'application/json');
        this.showAlert('✅ JSONファイルをバックアップしました。', 'success');
    }

    async exportToPrintReport() {
        if (this.data.length === 0) {
            this.showAlert('レポート出力するデータがありません。', 'warning');
            return;
        }

        const reportMetadata = await this.requestReportMetadata();
        if (reportMetadata === null) {
            this.showAlert('レポート出力をキャンセルしました。', 'info');
            return;
        }

        const reportData = this.buildReportData(reportMetadata);
        const reportWindow = window.open('', '_blank');

        if (!reportWindow) {
            this.showAlert('レポート画面を開けませんでした。ポップアップ設定を確認してください。', 'danger');
            return;
        }

        reportWindow.document.write(this.buildPrintReportHtml(reportData));
        reportWindow.document.close();
        reportWindow.focus();

        this.showAlert('🖨️ 印刷用レポートを開きました。ブラウザの印刷からPDF保存できます。', 'success');
    }

    async exportToPdfReport() {
        if (this.data.length === 0) {
            this.showAlert('PDF出力するデータがありません。', 'warning');
            return;
        }

        if (!window.html2canvas || !window.jspdf?.jsPDF) {
            this.showAlert('PDF出力ライブラリの読み込みに失敗しました。ページを再読み込みしてください。', 'danger');
            return;
        }

        const reportMetadata = await this.requestReportMetadata();
        if (reportMetadata === null) {
            this.showAlert('PDF出力をキャンセルしました。', 'info');
            return;
        }

        const reportData = this.buildReportData(reportMetadata);
        const pdfContainer = this.createPdfRenderContainer(reportData);

        try {
            const canvas = await window.html2canvas(pdfContainer, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true,
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const printableWidth = pageWidth - (margin * 2);
            const printableHeight = pageHeight - (margin * 2);
            const pixelsPerMm = canvas.width / printableWidth;
            const pageSliceHeightPx = Math.floor(printableHeight * pixelsPerMm);
            let offsetY = 0;
            let pageIndex = 0;

            while (offsetY < canvas.height) {
                const sliceHeight = Math.min(pageSliceHeightPx, canvas.height - offsetY);
                const pageCanvas = document.createElement('canvas');
                pageCanvas.width = canvas.width;
                pageCanvas.height = sliceHeight;

                const pageContext = pageCanvas.getContext('2d');
                pageContext.fillStyle = '#ffffff';
                pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
                pageContext.drawImage(
                    canvas,
                    0,
                    offsetY,
                    canvas.width,
                    sliceHeight,
                    0,
                    0,
                    canvas.width,
                    sliceHeight
                );

                const sliceHeightMm = sliceHeight / pixelsPerMm;
                const imageData = pageCanvas.toDataURL('image/png');

                if (pageIndex > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imageData, 'PNG', margin, margin, printableWidth, sliceHeightMm, undefined, 'FAST');
                offsetY += sliceHeight;
                pageIndex += 1;
            }

            pdf.save(`astr_reward_report_${this.formatDateForFile(new Date())}.pdf`);
            this.showAlert('📄 PDFファイルをダウンロードしました。', 'success');
        } catch (error) {
            console.error('PDF出力エラー:', error);
            this.showAlert('❌ PDF出力に失敗しました。', 'danger');
        } finally {
            pdfContainer.remove();
        }
    }

    requestReportMetadata() {
        const modalElement = document.getElementById('reportMetadataModal');
        const form = document.getElementById('reportMetadataForm');
        const walletAddressInput = document.getElementById('reportWalletAddressInput');
        const walletNameInput = document.getElementById('reportWalletNameInput');
        const memoInput = document.getElementById('reportMemoInput');
        const savedMetadata = this.loadReportMetadata();

        walletAddressInput.value = savedMetadata.walletAddress;
        walletNameInput.value = savedMetadata.walletName;
        memoInput.value = savedMetadata.memo;

        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);

        return new Promise((resolve) => {
            let submittedMetadata = null;

            const cleanup = () => {
                form.removeEventListener('submit', handleSubmit);
                modalElement.removeEventListener('hidden.bs.modal', handleHidden);
            };

            const handleSubmit = (event) => {
                event.preventDefault();
                submittedMetadata = {
                    walletAddress: walletAddressInput.value.trim(),
                    walletName: walletNameInput.value.trim(),
                    memo: memoInput.value.trim(),
                };
                this.saveReportMetadata(submittedMetadata);
                modal.hide();
            };

            const handleHidden = () => {
                cleanup();
                resolve(submittedMetadata);
            };

            form.addEventListener('submit', handleSubmit);
            modalElement.addEventListener('hidden.bs.modal', handleHidden);
            modal.show();
        });
    }

    loadReportMetadata() {
        try {
            const storedMetadata = localStorage.getItem(this.reportMetadataKey);
            if (!storedMetadata) {
                return {
                    walletAddress: '',
                    walletName: '',
                    memo: '',
                };
            }

            const parsedMetadata = JSON.parse(storedMetadata);
            return {
                walletAddress: parsedMetadata.walletAddress || '',
                walletName: parsedMetadata.walletName || '',
                memo: parsedMetadata.memo || '',
            };
        } catch (error) {
            console.error('レポート補足情報の読み込みに失敗しました:', error);
            return {
                walletAddress: '',
                walletName: '',
                memo: '',
            };
        }
    }

    saveReportMetadata(metadata) {
        try {
            localStorage.setItem(this.reportMetadataKey, JSON.stringify(metadata));
        } catch (error) {
            console.error('レポート補足情報の保存に失敗しました:', error);
        }
    }

    buildReportData(reportMetadata) {
        const entries = [...this.data].sort((a, b) => new Date(a.date) - new Date(b.date));
        const totals = this.calculateTotals();
        const monthlyData = this.calculateMonthlyTotals();
        const chartCanvas = document.getElementById('monthlyChart');
        const chartImage = monthlyData.length > 0 && chartCanvas ? chartCanvas.toDataURL('image/png') : '';

        return {
            entries,
            totals,
            monthlyData,
            chartImage,
            generatedAt: new Date().toLocaleString('ja-JP'),
            reportMetadata,
        };
    }

    buildPrintReportHtml({ entries, totals, monthlyData, chartImage, generatedAt, reportMetadata }) {
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASTR Reward Report</title>
    <style>${this.getReportStyles()}</style>
</head>
<body>
    <div class="toolbar">
        <div>印刷ダイアログから PDF 保存できます。</div>
        <div class="toolbar-actions">
            <button class="primary" onclick="window.print()">印刷 / PDF保存</button>
            <button class="secondary" onclick="window.close()">閉じる</button>
        </div>
    </div>
    ${this.buildReportBodyHtml({ entries, totals, monthlyData, chartImage, generatedAt, reportMetadata })}
</body>
</html>`;
    }

    createPdfRenderContainer(reportData) {
        const container = document.createElement('div');
        container.id = 'pdfRenderContainer';
        container.style.cssText = [
            'position: fixed',
            'left: -99999px',
            'top: 0',
            'width: 794px',
            'padding: 0',
            'margin: 0',
            'background: #ffffff',
            'z-index: -1'
        ].join(';');
        container.innerHTML = `
            <style>
                ${this.getReportStyles()}
                #pdfRenderContainer {
                    font-family: "Segoe UI", "Yu Gothic UI", sans-serif;
                    color: #16202a;
                }
                #pdfRenderContainer .page {
                    width: 100%;
                    margin: 0;
                    padding: 16mm 12mm;
                    box-shadow: none;
                }
            </style>
            ${this.buildReportBodyHtml(reportData)}
        `;
        document.body.appendChild(container);
        return container;
    }

    buildReportBodyHtml({ entries, totals, monthlyData, chartImage, generatedAt, reportMetadata }) {
        const reportPeriod = `${this.formatDate(entries[0].date)} 〜 ${this.formatDate(entries[entries.length - 1].date)}`;
        const detailItems = [
            ['ウォレットアドレス', reportMetadata.walletAddress],
            ['ウォレット名', reportMetadata.walletName],
        ].filter(([, value]) => value);
        const summaryCards = [
            ['Claim回数', `${totals.totalCount}`],
            ['合計ASTR量', `${this.formatNumber(totals.totalAstr, 2)} ASTR`],
            ['合計Fee', `${this.formatNumber(totals.totalFee, 5)} ASTR`],
            ['合計Fee（JPY）', `¥${this.formatCurrency(totals.totalFeeJPY, 0)}`],
            ['総リワード（USD）', `$${this.formatCurrency(totals.totalRewardUSD)}`],
            ['総リワード（JPY）', `¥${this.formatCurrency(totals.totalRewardJPY, 0)}`],
            ['最終損益額（JPY）', `¥${this.formatCurrency(totals.netProfitJPY, 0)}`],
        ].map(([label, value]) => `
            <section class="summary-card">
                <div class="summary-label">${this.escapeHtml(label)}</div>
                <div class="summary-value">${this.escapeHtml(value)}</div>
            </section>
        `).join('');

        const monthlyRows = monthlyData.length > 0
            ? monthlyData.map((item) => `
                <tr>
                    <td>${this.escapeHtml(item.month)}</td>
                    <td class="text-end">¥${this.escapeHtml(this.formatCurrency(item.totalRewardJPY, 0))}</td>
                    <td class="text-end">¥${this.escapeHtml(this.formatCurrency(item.totalFeeJPY, 0))}</td>
                    <td class="text-end">¥${this.escapeHtml(this.formatCurrency(item.netProfitJPY, 0))}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="4" class="text-center">月別データはありません。</td>
                </tr>
            `;

        const historyRows = entries.map((entry, index) => {
            const calc = this.calculateEntry(entry);

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>${this.escapeHtml(this.formatDate(entry.date))}</td>
                    <td class="text-end">${this.escapeHtml(this.formatNumber(entry.astrAmount, 2))} ASTR</td>
                    <td class="text-end cell-stack">
                        <span>USD/JPY ${this.escapeHtml(this.formatCurrency(entry.exchangeRate, 2))}</span>
                        <span>ASTR/USD ${this.escapeHtml(this.formatCurrency(entry.astrPrice, 4))}</span>
                    </td>
                    <td class="text-end cell-stack">
                        <span>Fee ${this.escapeHtml(this.formatNumber(entry.fee, 5))} ASTR</span>
                        <span>Reward $${this.escapeHtml(this.formatCurrency(calc.rewardUSD, 2))}</span>
                    </td>
                    <td class="text-end cell-stack">
                        <span>Reward ¥${this.escapeHtml(this.formatCurrency(calc.rewardJPY, 0))}</span>
                        <span>Profit ¥${this.escapeHtml(this.formatCurrency(calc.profitJPY, 0))}</span>
                    </td>
                </tr>
            `;
        }).join('');

        const chartSection = chartImage
            ? `
                <figure class="chart-card section-card avoid-break">
                    <img src="${chartImage}" alt="月別集計グラフ">
                    <figcaption>月別の合計リワード額（JPY）を表示</figcaption>
                </figure>
            `
            : `
                <div class="section-card avoid-break muted-box">
                    月別集計グラフを表示できるデータがありません。
                </div>
            `;

        const detailSection = detailItems.length > 0
            ? `
                <div class="wallet-box">
                    ${detailItems.map(([label, value]) => `
                        <div class="wallet-row">
                            <div class="wallet-label">${this.escapeHtml(label)}</div>
                            <div class="wallet-value">${this.escapeHtml(value)}</div>
                        </div>
                    `).join('')}
                </div>
            `
            : '';

        const memoSection = reportMetadata.memo
            ? `
                <section class="section avoid-break">
                    <h2>メモ</h2>
                    <div class="section-card memo-card">${this.escapeHtml(reportMetadata.memo).replace(/\n/g, '<br>')}</div>
                </section>
            `
            : '';

        return `<main class="page">
        <header class="report-header avoid-break">
            <div>
                <div class="report-badge">ASTR Reward Tax Calculator v${this.escapeHtml(this.appVersion)}</div>
                <h1 class="report-title">ASTR Reward Report</h1>
                <p class="report-subtitle">Astar dApp Staking の Claim 履歴と集計を印刷向けに整理したレポートです。</p>
            </div>
            <div class="header-meta">
                <p class="report-meta">出力日時: ${this.escapeHtml(generatedAt)}</p>
                <p class="report-meta">対象期間: ${this.escapeHtml(reportPeriod)}</p>
                <p class="report-meta">件数: ${this.escapeHtml(String(entries.length))} 件</p>
                <p class="report-meta">Builder: tksarah</p>
                ${detailSection}
            </div>
        </header>

        <section class="section">
            <h2>集計結果</h2>
            <div class="summary-grid">
                ${summaryCards}
            </div>
        </section>

        <section class="section">
            <h2>月別集計グラフ</h2>
            ${chartSection}
        </section>

        ${memoSection}

        <section class="section avoid-break">
            <h2>月別集計一覧</h2>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>年月</th>
                            <th class="text-end">合計リワード（JPY）</th>
                            <th class="text-end">合計Fee（JPY）</th>
                            <th class="text-end">最終損益額（JPY）</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${monthlyRows}
                    </tbody>
                </table>
            </div>
        </section>

        <section class="section">
            <h2>Claim 履歴一覧</h2>
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>日付</th>
                            <th class="text-end">Claim量</th>
                            <th class="text-end">レート情報</th>
                            <th class="text-end">Fee / Reward（USD）</th>
                            <th class="text-end">Reward / Profit（JPY）</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${historyRows}
                    </tbody>
                </table>
            </div>
        </section>

        <footer class="report-footer">
            このレポートは参考資料です。確定申告や税務判断の前に、必ず税理士または税務署へ確認してください。
        </footer>
    </main>`;
    }

    getReportStyles() {
        return `
        :root {
            color-scheme: light;
            --ink: #16202a;
            --muted: #5f6b76;
            --line: #d6dde3;
            --paper: #ffffff;
            --panel: #f4f7f9;
            --accent: #0f766e;
            --accent-soft: #d9f3ee;
        }
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            font-family: "Segoe UI", "Yu Gothic UI", sans-serif;
            color: var(--ink);
            background: #e9eef2;
        }
        .toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 20px;
            background: rgba(22, 32, 42, 0.92);
            color: #ffffff;
        }
        .toolbar-actions {
            display: flex;
            gap: 10px;
        }
        .toolbar button {
            border: 0;
            border-radius: 999px;
            padding: 10px 16px;
            font: inherit;
            cursor: pointer;
        }
        .toolbar .primary {
            background: #f59e0b;
            color: #1f2937;
        }
        .toolbar .secondary {
            background: #dbe4ea;
            color: #1f2937;
        }
        .page {
            width: min(920px, calc(100vw - 32px));
            margin: 20px auto 40px;
            padding: 28px;
            background: var(--paper);
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
        }
        .report-header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            align-items: flex-start;
            margin-bottom: 28px;
        }
        .report-title {
            margin: 0 0 8px;
            font-size: 30px;
            line-height: 1.1;
        }
        .report-subtitle,
        .report-meta {
            margin: 0;
            color: var(--muted);
        }
        .report-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 999px;
            background: var(--accent-soft);
            color: var(--accent);
            font-weight: 700;
            margin-bottom: 10px;
        }
        .section {
            margin-top: 28px;
        }
        .header-meta {
            min-width: 280px;
        }
        .wallet-box {
            margin-top: 12px;
            padding: 12px 14px;
            border-radius: 12px;
            border: 1px solid #b8c7d1;
            background: #eef4f7;
        }
        .wallet-row + .wallet-row {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px dashed var(--line);
        }
        .wallet-label {
            margin-bottom: 4px;
            color: #30424f;
            font-size: 12px;
            font-weight: 700;
        }
        .wallet-value {
            color: #101820;
            font-size: 13px;
            font-weight: 600;
            overflow-wrap: anywhere;
            word-break: break-all;
        }
        .memo-card {
            padding: 16px;
            color: #101820;
            line-height: 1.6;
            white-space: normal;
        }
        .section h2 {
            margin: 0 0 14px;
            font-size: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .summary-card,
        .section-card,
        .muted-box {
            border: 1px solid var(--line);
            border-radius: 16px;
            background: var(--panel);
        }
        .summary-card {
            padding: 16px;
        }
        .summary-label {
            color: var(--muted);
            font-size: 13px;
            margin-bottom: 8px;
        }
        .summary-value {
            font-size: 24px;
            font-weight: 700;
        }
        .chart-card {
            padding: 20px;
            text-align: center;
        }
        .chart-card img {
            width: 100%;
            height: auto;
        }
        .chart-card figcaption {
            margin-top: 10px;
            color: var(--muted);
            font-size: 13px;
        }
        .table-wrap {
            overflow: hidden;
            border: 1px solid var(--line);
            border-radius: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
        }
        thead {
            background: #eef4f6;
        }
        th,
        td {
            padding: 9px 10px;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
        }
        tbody tr:nth-child(even) {
            background: #fbfcfd;
        }
        .text-end {
            text-align: right;
        }
        .text-center {
            text-align: center;
        }
        .cell-stack span {
            display: block;
            white-space: nowrap;
        }
        .report-footer {
            margin-top: 22px;
            padding-top: 12px;
            border-top: 1px solid var(--line);
            color: var(--muted);
            font-size: 12px;
        }
        .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
        }
        .muted-box {
            padding: 20px;
            color: var(--muted);
        }
        @page {
            size: A4 portrait;
            margin: 12mm;
        }
        @media (max-width: 900px) {
            .page {
                width: calc(100vw - 16px);
                padding: 18px;
            }
            .report-header {
                flex-direction: column;
            }
            .summary-grid {
                grid-template-columns: 1fr;
            }
            .toolbar {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
            }
            .toolbar-actions {
                width: 100%;
            }
            .toolbar button {
                flex: 1;
            }
        }
        @media print {
            body {
                background: #ffffff;
            }
            .toolbar {
                display: none;
            }
            .page {
                width: auto;
                margin: 0;
                padding: 0;
                box-shadow: none;
            }
            .summary-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            table {
                font-size: 10px;
            }
            th,
            td {
                padding: 7px 6px;
            }
            a {
                color: inherit;
                text-decoration: none;
            }
        }`;
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
    // テーマ機能
    // ========================

    initTheme() {
        const savedTheme = this.getTheme();
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.saveTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const button = document.getElementById('themeToggle');
        const logo = document.getElementById('appLogo');
        if (theme === 'dark') {
            button.innerHTML = '☀️ ライト';
            button.className = 'btn btn-light btn-sm';
            if (logo) {
                logo.src = logo.dataset.darkSrc;
            }
        } else {
            button.innerHTML = '🌙 ダーク';
            button.className = 'btn btn-outline-secondary btn-sm';
            if (logo) {
                logo.src = logo.dataset.lightSrc;
            }
        }
        // テーマ変更時にグラフを完全に再作成
        this.forceUpdateChart();
    }

    getTheme() {
        return localStorage.getItem(this.themeKey) || 'light';
    }

    saveTheme(theme) {
        localStorage.setItem(this.themeKey, theme);
    }

    forceUpdateChart() {
        // 既存のチャートを完全に破棄
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
            this.monthlyChart = null;
        }

        // DOM更新を待ってから再作成
        setTimeout(() => {
            this.renderChart();
        }, 50); // 50ms遅延でDOM更新を待つ
    }

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

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    }

    formatDateForFile(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${minutes}${seconds}`;
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

    escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
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
