// --- Estado ---
let currentDate = new Date();
let transactions = [];

// --- Elementos ---
const balanceEl = document.getElementById('balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const transactionForm = document.getElementById('transaction-form');
const currentMonthDisplay = document.getElementById('current-month-display');
const transactionBody = document.getElementById('transaction-body');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const filterText = document.getElementById('filter-text');
const filterType = document.getElementById('filter-type');
const sortOrder = document.getElementById('sort-order');

// Formatador BRL
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

// --- Auxiliares ---
function setTodayDateInput() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
}

function getTransactionsForCurrentMonth() {
    return transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentDate.getMonth() && tDate.getFullYear() === currentDate.getFullYear();
    });
}

// --- Renderização ---
function updateInterface() {
    // Título Mês
    let monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
    monthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const year = currentDate.getFullYear();
    currentMonthDisplay.textContent = `${monthName} ${year}`;

    const monthTransactions = getTransactionsForCurrentMonth();
    updateSummary(monthTransactions);
    renderTable(monthTransactions);
}

function updateSummary(monthData) {
    const income = monthData.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = monthData.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const total = income - expense;

    totalIncomeEl.innerText = currencyFormatter.format(income);
    totalExpensesEl.innerText = currencyFormatter.format(expense);
    balanceEl.innerText = currencyFormatter.format(total);

    // Cores no modo escuro
    balanceEl.className = `mb-0 fw-bold ${total >= 0 ? 'text-primary' : 'text-danger'}`;
}

function renderTable(monthData) {
    let filteredData = [...monthData];

    // Filtros e Ordenação
    const searchText = filterText.value.toLowerCase();
    if (searchText) filteredData = filteredData.filter(t => t.description.toLowerCase().includes(searchText));

    const typeValue = filterType.value;
    if (typeValue !== 'all') filteredData = filteredData.filter(t => t.type === typeValue);

    const sortValue = sortOrder.value;
    filteredData.sort((a, b) => {
        if (sortValue === 'date-desc') return b.date - a.date;
        if (sortValue === 'date-asc') return a.date - b.date;
        if (sortValue === 'amount-desc') return b.amount - a.amount;
        if (sortValue === 'amount-asc') return a.amount - b.amount;
        return 0;
    });

    transactionBody.innerHTML = '';

    if (filteredData.length === 0) {
        transactionBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5">
                    <div class="text-secondary opacity-50 mb-2">
                        <i class="fa-regular fa-folder-open fa-2x"></i>
                    </div>
                    <span class="text-secondary small">Nenhum registro encontrado.</span>
                </td>
            </tr>`;
        return;
    }

    filteredData.forEach(t => {
        const row = document.createElement('tr');

        const isIncome = t.type === 'income';
        const typeLabel = isIncome ? 'Receita' : 'Despesa';

        const badgeClass = isIncome
            ? 'bg-success-subtle text-success-emphasis'
            : 'bg-danger-subtle text-danger-emphasis';
        const textColorClass = isIncome ? 'text-success' : 'text-danger';

        const dateObj = new Date(t.date);
        const dateFormatted = dateObj.toLocaleDateString('pt-BR');

        row.innerHTML = `
            <td class="ps-4 text-secondary small">${dateFormatted}</td>
            <td class="fw-medium text-body">${t.description}</td>
            <td>
                <span class="badge rounded-pill border border-0 ${badgeClass} px-3 py-2">
                   ${typeLabel}
                </span>
            </td>
            <td class="pe-4 text-end fw-bold ${textColorClass}">
                ${isIncome ? '+' : '-'} ${currencyFormatter.format(t.amount).replace('R$', '')}
            </td>
            <td class="text-end pe-3">
                <button onclick="removeTransaction(${
                    t.id
                })" class="btn btn-sm btn-link text-danger text-opacity-50 text-opacity-100-hover p-0" title="Excluir">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        transactionBody.appendChild(row);
    });
}

async function deleteTransaction(id) {
    await fetch(`/transactions/${id}`, {
        method: 'DELETE',
        cache: 'no-store',
    });
}

async function postTransaction(transaction) {
    await fetch(`/transactions`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            description: transaction.description,
            amount: transaction.amount,
            type: transaction.type,
            date: transaction.date,
        }),
    });
}

async function loadTransaction() {
    let response = await fetch(`/transactions`, {
        method: 'GET',
        cache: 'no-store',
    });
    return await response.json();
}

// --- Funções de Ação ---

function addTransaction(description, amount, type, dateValue) {
    const transactionDate = dateValue ? new Date(dateValue + 'T12:00:00') : new Date();

    const transaction = {
        id: Date.now(),
        description: description,
        amount: parseFloat(amount),
        type: type,
        date: transactionDate,
    };

    postTransaction(transaction).then(() => {
        loadTransaction().then(data => {
            transactions = data;
            updateInterface();
        });
    });
}

// Nova função para remover
window.removeTransaction = function (id) {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        deleteTransaction(id).then(() => {
            loadTransaction().then(data => {
                transactions = data;
                updateInterface();
            });
        });
    }
};

// --- Event Listeners ---
transactionForm.addEventListener('submit', e => {
    e.preventDefault();
    const desc = document.getElementById('description').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    const type = document.querySelector('input[name="type"]:checked').value;

    if (desc && amount && date) {
        addTransaction(desc, amount, type, date);
        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        document.getElementById('description').focus();
    }
});

prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateInterface();
});
nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateInterface();
});

filterText.addEventListener('input', () => renderTable(getTransactionsForCurrentMonth()));
filterType.addEventListener('change', () => renderTable(getTransactionsForCurrentMonth()));
sortOrder.addEventListener('change', () => renderTable(getTransactionsForCurrentMonth()));

// Init;
loadTransaction().then(response => {
    transactions = response;
    updateInterface();
});
setTodayDateInput();
