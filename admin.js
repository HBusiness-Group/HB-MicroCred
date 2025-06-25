document.addEventListener('DOMContentLoaded', () => {

    // --- SELEÇÃO DE ELEMENTOS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = loginForm.querySelector('button[type="submit"]');
    const userProfileName = document.getElementById('user-profile-name');
    const logoutBtn = document.getElementById('logout-btn');
    const usersSection = document.getElementById('users-section');
    const usersTableBody = document.getElementById('users-table-body');
    const addUserRowBtn = document.getElementById('add-user-row-btn');
    const saveUsersBtn = document.getElementById('save-users-btn');
    const clientsSection = document.getElementById('clients-section');
    const clientsTableHead = document.getElementById('clients-table-head');
    const clientsTableBody = document.getElementById('clients-table-body');
    const addClientRowBtn = document.getElementById('add-client-row-btn');
    const saveClientsBtn = document.getElementById('save-clients-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- DADOS E VARIÁVEIS DE ESTADO ---
    const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwrRsGd1SFbicqT_HqXCvMPwfIIEYCRtTYMzEKRs_DTBYDD4hlnGPxyU264HtOCzOxE/exec';
    const EDITABLE_CLIENT_COLUMNS = [5, 9]; 

    let currentUser = null;
    let clientDataHeaders = [];
    let fullClientData = [];
    
    // --- FUNÇÕES ---

    const showToast = (message, isError = false) => {
        toastMessage.textContent = message;
        toast.className = 'fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-lg transition-opacity duration-300';
        toast.classList.add(isError ? 'bg-red-600' : 'bg-slate-800', 'opacity-100');
        setTimeout(() => toast.classList.remove('opacity-100'), 4000);
    };
    
    const setButtonLoading = (button, isLoading) => {
        const btnText = button.querySelector('.btn-text');
        const loader = button.querySelector('.loader-sm');
        if (btnText) btnText.classList.toggle('hidden', isLoading);
        if (loader) loader.classList.toggle('hidden', !isLoading);
        button.disabled = isLoading;
    };
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setButtonLoading(loginButton, true);
        loginError.classList.add('hidden');

        try {
            const response = await fetch(googleScriptURL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', username: usernameInput.value, password: passwordInput.value }),
                headers: { 'Content-Type': 'application/json' },
            });
            
            const result = await response.json();
            if (result.result !== 'success') throw new Error(result.message);

            currentUser = { username: result.username, profile: result.profile };
            loginScreen.classList.add('hidden');
            mainContent.classList.remove('hidden');
            userProfileName.textContent = `${result.username} (${result.profile})`;
            await initializeDashboard();

        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        } finally {
            setButtonLoading(loginButton, false);
        }
    };

    const handleLogout = () => {
        currentUser = null;
        mainContent.classList.add('hidden');
        loginScreen.classList.remove('hidden');
        usernameInput.value = '';
        passwordInput.value = '';
        loginError.classList.add('hidden');
        usersSection.classList.add('hidden');
    };

    const initializeDashboard = async () => {
        clientsTableBody.innerHTML = '<tr><td colspan="11" class="text-center p-4">Carregando dados...</td></tr>';
        if (currentUser.profile === 'Administrador') {
            usersSection.classList.remove('hidden');
            usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Carregando usuários...</td></tr>';
            await fetchAndRenderTable('users');
        }
        await fetchAndRenderTable('clients');
    };

    const fetchAndRenderTable = async (type) => {
        try {
            const url = `${googleScriptURL}?action=get${type.charAt(0).toUpperCase() + type.slice(1)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha na resposta da rede.');
            const data = await response.json();

            if (type === 'users') {
                renderTable('users', data.slice(1), true, ["Usuário", "Senha", "Perfil"]);
            } else {
                clientDataHeaders = data[0] || [];
                fullClientData = data; // Armazena todos os dados
                renderClientsView();
            }
        } catch (error) {
            showToast(`Falha ao carregar ${type}.`, true);
        }
    };
    
    const renderClientsView = () => {
        let rowsToDisplay = fullClientData.slice(1);
        if (currentUser.profile === 'Editor') {
            const refIndex = clientDataHeaders.map(h => h.toLowerCase()).indexOf('referencename');
            if (refIndex > -1) {
                rowsToDisplay = rowsToDisplay.filter(row => row[refIndex] === currentUser.username);
            }
        }
        renderTable('clients', rowsToDisplay, true, clientDataHeaders, EDITABLE_CLIENT_COLUMNS);
    };

    const renderTable = (type, data, isEditable, headers, editableColumns = null) => {
        const tbody = type === 'users' ? usersTableBody : clientsTableBody;
        const thead = type === 'users' ? usersTableBody.previousElementSibling : clientsTableHead;
        tbody.innerHTML = '';
        thead.innerHTML = '';
        
        if (headers) {
            const headerRow = thead.insertRow();
            headers.forEach(headerText => {
                const th = document.createElement('th');
                th.className = "px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider";
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            const thAction = document.createElement('th');
            thAction.textContent = "Ações";
            headerRow.appendChild(thAction);
        }
        
        data.forEach(rowData => {
            const tr = tbody.insertRow();
            tr.className = "bg-white even:bg-slate-50";
            rowData.forEach((cellData, cellIndex) => {
                const td = tr.insertCell();
                td.className = "px-4 py-2 border-t border-slate-200";
                td.textContent = cellData;
                const canEdit = isEditable && (!editableColumns || editableColumns.includes(cellIndex));
                if (canEdit) td.setAttribute('contenteditable', 'true');
            });
            tr.appendChild(createActionsCell(tr, type));
        });
    };
    
    const createActionsCell = (row, type) => {
        const td = row.insertCell();
        td.className = "px-4 py-2 border-t border-slate-200";
        if (currentUser.profile === 'Administrador' || (type === 'clients' && currentUser.profile === 'Editor')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'text-red-500 hover:text-red-700 text-xs';
            deleteBtn.onclick = () => row.remove();
            td.appendChild(deleteBtn);
        }
        return td;
    };
    
    const addRow = (type) => {
        const isUserTable = type === 'users';
        const tbody = isUserTable ? usersTableBody : clientsTableBody;
        const colCount = isUserTable ? 3 : clientDataHeaders.length;
        if (colCount === 0 && !isUserTable) {
             showToast("Carregue os dados primeiro.", true);
             return;
        }

        const tr = tbody.insertRow(0); // Insere no topo
        tr.className = "bg-white even:bg-slate-50";
        for (let i = 0; i < colCount; i++) {
            const td = tr.insertCell();
            td.className = "px-4 py-2 border-t border-slate-200";
            const canEdit = isUserTable || EDITABLE_CLIENT_COLUMNS.includes(i);
            if (canEdit) td.setAttribute('contenteditable', 'true');
        }
        tr.appendChild(createActionsCell(tr, type));
    };
    
    const getTableData = (tbody, headers) => {
        const data = [headers];
        tbody.querySelectorAll('tr').forEach(tr => {
            const rowData = [];
            tr.querySelectorAll('td').forEach((td, index) => {
                if (index < headers.length) { 
                    rowData.push(td.textContent.trim());
                }
            });
            if (rowData.length > 0) data.push(rowData);
        });
        return data;
    };

    const saveChanges = async (type) => {
        const button = type === 'users' ? saveUsersBtn : saveClientsBtn;
        setButtonLoading(button, true);
        
        let payload;
        if (type === 'users') {
            const tableData = getTableData(usersTableBody, ["usuario", "senha", "perfil"]);
            payload = { action: 'updateUsers', data: tableData, user: currentUser.username, profile: currentUser.profile };
        } else {
            const tableData = getTableData(clientsTableBody, clientDataHeaders);
            payload = { action: 'updateClients', data: tableData, user: currentUser.username, profile: currentUser.profile };
        }
        
        try {
            const response = await fetch(googleScriptURL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            
            const result = await response.json();
            if (result.result !== 'success') throw new Error(result.message);
            showToast('Alterações salvas com sucesso!');
        } catch (error) {
            showToast(`Falha ao salvar. ${error.message}`, true);
        } finally {
            setButtonLoading(button, false);
            await fetchAndRenderTable(type);
        }
    };
    
    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addUserRowBtn.addEventListener('click', () => addRow('users'));
    addClientRowBtn.addEventListener('click', () => addRow('clients'));
    saveUsersBtn.addEventListener('click', () => saveChanges('users'));
    saveClientsBtn.addEventListener('click', () => confirmationModal.classList.remove('hidden'));
    cancelBtn.addEventListener('click', () => confirmationModal.classList.add('hidden'));
    confirmBtn.addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
        saveChanges('clients');
    });
});
