document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');
    const userProfileName = document.getElementById('user-profile-name');
    const logoutBtn = document.getElementById('logout-btn');
    const usersSection = document.getElementById('users-section');
    const usersTableBody = document.getElementById('users-table-body');
    const usersTableHead = usersTableBody.previousElementSibling;
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

    // --- CONFIGURAÇÃO ---
    const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwrRsGd1SFbicqT_HqXCvMPwfIIEYCRtTYMzEKRs_DTBYDD4hlnGPxyU264HtOCzOxE/exec';
    const EDITABLE_CLIENT_COLUMNS_FOR_EDITOR = [5, 8, 10]; // Índices originais: F, I, K

    // --- ESTADO DA APLICAÇÃO ---
    let currentUser = null;
    let clientDataHeaders = [];
    
    // --- FUNÇÕES AUXILIARES ---
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
    
    // --- LÓGICA DE LOGIN/LOGOUT ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setButtonLoading(loginButton, true);
        loginError.classList.add('hidden');

        try {
            const formData = new FormData();
            formData.append('action', 'login');
            formData.append('username', usernameInput.value);
            formData.append('password', passwordInput.value);

            const response = await fetch(googleScriptURL, {
                method: 'POST',
                body: formData,
            });
            
            if (!response.ok) throw new Error(`Erro de rede: ${response.statusText}`);
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

    // --- LÓGICA DO PAINEL ---
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
            if (data.status === 'error') throw new Error(data.message);

            if (type === 'users') {
                renderTable('users', data);
            } else {
                clientDataHeaders = data[0] || [];
                renderTable('clients', data);
            }
        } catch (error) {
            showToast(`Falha ao carregar ${type}: ${error.message}`, true);
        }
    };

    const renderTable = (type, data) => {
        const isUsers = type === 'users';
        const tbody = isUsers ? usersTableBody : clientsTableBody;
        const thead = isUsers ? usersTableHead : clientsTableHead;
        
        const headers = isUsers ? data[0] : clientDataHeaders.slice(1, 11); // B a K
        let rows = data.slice(1);

        tbody.innerHTML = '';
        thead.innerHTML = '';
        
        const headerRow = thead.insertRow();
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.className = "px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50";
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        const thAction = document.createElement('th');
        thAction.textContent = "Ações";
        headerRow.appendChild(thAction);

        if (!isUsers && currentUser.profile === 'Editor') {
            const refIndex = clientDataHeaders.map(h => h.toLowerCase()).indexOf('referencename');
            if (refIndex !== -1) {
                rows = rows.filter(row => row[refIndex] === currentUser.username);
            }
        }

        rows.forEach(rowData => {
            const tr = tbody.insertRow();
            tr.className = "bg-white even:bg-slate-50";
            tr.dataset.fullRow = JSON.stringify(rowData);
            
            const dataToRender = isUsers ? rowData : rowData.slice(1, 11);

            dataToRender.forEach((cellData, cellIndex) => {
                const td = tr.insertCell();
                td.className = "px-4 py-2 border-t border-slate-200";
                td.textContent = cellData;
                
                let isCellEditable = false;
                if (isUsers && currentUser.profile === 'Administrador') {
                    isCellEditable = true;
                } else if (!isUsers) {
                    const originalColumnIndex = cellIndex + 1; 
                    if (currentUser.profile === 'Administrador' || EDITABLE_CLIENT_COLUMNS_FOR_EDITOR.includes(originalColumnIndex)) {
                        isCellEditable = true;
                    }
                }
                if (isCellEditable) td.setAttribute('contenteditable', 'true');
            });
            tr.appendChild(createActionsCell(tr));
        });
    };
    
    const createActionsCell = (row) => {
        const td = row.insertCell();
        td.className = "px-4 py-2 border-t border-slate-200";
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'text-red-500 hover:text-red-700 text-xs';
        deleteBtn.onclick = () => row.remove();
        td.appendChild(deleteBtn);
        return td;
    };
    
    const addRow = (type) => {
        const isUserTable = type === 'users';
        const tbody = isUserTable ? usersTableBody : clientsTableBody;
        const colCount = isUserTable ? 3 : 10;
        
        const tr = tbody.insertRow(0); 
        tr.className = "bg-white even:bg-slate-50";
        const newRowData = new Array(isUserTable ? 3 : clientDataHeaders.length).fill('');
        tr.dataset.fullRow = JSON.stringify(newRowData);

        for (let i = 0; i < colCount; i++) {
            const td = tr.insertCell();
            td.className = "px-4 py-2 border-t border-slate-200";
            td.setAttribute('contenteditable', 'true');
        }
        tr.appendChild(createActionsCell(tr));
    };
    
    const getTableDataForSave = (tbody, allHeaders, displayedHeaders) => {
        const data = [allHeaders];
        tbody.querySelectorAll('tr').forEach(tr => {
            let rowData = JSON.parse(tr.dataset.fullRow);
            const displayedCells = tr.querySelectorAll('td');
            
            displayedCells.forEach((td, index) => {
                if (index < displayedHeaders.length) {
                    const headerName = displayedHeaders[index];
                    const originalIndex = allHeaders.indexOf(headerName);
                    if(originalIndex !== -1) {
                       rowData[originalIndex] = td.textContent.trim();
                    }
                }
            });
            data.push(rowData);
        });
        return data;
    };

    const saveChanges = async (type) => {
        const isUsers = type === 'users';
        const button = isUsers ? saveUsersBtn : saveClientsBtn;
        setButtonLoading(button, true);
        
        const tbody = isUsers ? usersTableBody : clientsTableBody;
        const headers = isUsers ? ["usuario", "senha", "perfil"] : clientDataHeaders;
        const displayedHeaders = isUsers ? headers : headers.slice(1,11);
        const tableData = getTableDataForSave(tbody, headers, displayedHeaders);

        const payload = new FormData();
        payload.append('action', `update${type.charAt(0).toUpperCase() + type.slice(1)}`);
        payload.append('user', currentUser.username);
        payload.append('profile', currentUser.profile);
        payload.append('data', JSON.stringify(tableData));
        
        try {
            const response = await fetch(googleScriptURL, { method: 'POST', body: payload });
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
