// Aguarda o carregamento completo da página antes de executar o script
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

    // Seção de Usuários
    const usersSection = document.getElementById('users-section');
    const usersTableBody = document.getElementById('users-table-body');
    const addUserRowBtn = document.getElementById('add-user-row-btn');
    const saveUsersBtn = document.getElementById('save-users-btn');

    // Seção de Clientes
    const clientsSection = document.getElementById('clients-section');
    const clientsTableHead = document.getElementById('clients-table-head');
    const clientsTableBody = document.getElementById('clients-table-body');
    const addClientRowBtn = document.getElementById('add-client-row-btn');
    const saveClientsBtn = document.getElementById('save-clients-btn');
    
    // Modal e Notificações
    const confirmationModal = document.getElementById('confirmation-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // --- DADOS E VARIÁVEIS DE ESTADO ---
    const googleScriptURL = 'https://script.google.com/macros/s/AKfycbwrRsGd1SFbicqT_HqXCvMPwfIIEYCRtTYMzEKRs_DTBYDD4hlnGPxyU264HtOCzOxE/exec';
    
    // As senhas foram removidas do código! A verificação agora é segura.
    let currentUser = null;
    let clientDataHeaders = [];
    
    // --- FUNÇÕES ---

    const showToast = (message, isError = false) => {
        toastMessage.textContent = message;
        toast.className = 'fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-lg transition-opacity duration-300';
        toast.classList.add(isError ? 'bg-red-600' : 'bg-slate-800', 'opacity-100');
        setTimeout(() => { toast.classList.remove('opacity-100'); }, 3000);
    };
    
    const setButtonLoading = (button, isLoading, originalText = 'Entrar') => {
        const btnText = button.querySelector('.btn-text');
        const loader = button.querySelector('.loader-sm');
        if(btnText){
            btnText.classList.toggle('hidden', isLoading);
        } else {
             button.textContent = isLoading ? '' : originalText;
        }

        if(loader){
            loader.classList.toggle('hidden', !isLoading);
        }
        button.disabled = isLoading;
    };
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setButtonLoading(loginButton, true, 'Entrar');
        loginError.classList.add('hidden');

        const username = usernameInput.value;
        const password = passwordInput.value;
        
        try {
            const response = await fetch(googleScriptURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', username, password })
            });

            const result = await response.json();

            if (result.result === 'success') {
                currentUser = { username: result.username, profile: result.profile };
                loginScreen.classList.add('hidden');
                mainContent.classList.remove('hidden');
                userProfileName.textContent = currentUser.profile;
                await initializeDashboard();
            } else {
                loginError.classList.remove('hidden');
                showToast(result.message || 'Usuário ou senha inválidos.', true);
            }
        } catch (error) {
            console.error('Erro de Login:', error);
            showToast('Erro de conexão ao tentar fazer login.', true);
        } finally {
            setButtonLoading(loginButton, false, 'Entrar');
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
        usersTableBody.innerHTML = '';
        clientsTableHead.innerHTML = '';
        clientsTableBody.innerHTML = '';
    };

    const initializeDashboard = async () => {
        if (currentUser.profile === 'Administrador') {
            usersSection.classList.remove('hidden');
            await fetchAndRenderTable('users');
        } else {
            usersSection.classList.add('hidden'); 
        }
        await fetchAndRenderTable('clients');
    };

    const fetchAndRenderTable = async (type) => {
        try {
            let url = `${googleScriptURL}?action=get${type.charAt(0).toUpperCase() + type.slice(1)}`;
            if (type === 'clients' && currentUser.profile === 'Editor') {
                url += `&user=${currentUser.username}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Falha na resposta da rede.');
            const data = await response.json();

            if (type === 'users') {
                renderUsersTable(data);
            } else if (type === 'clients') {
                renderClientsTable(data);
            }
        } catch (error) {
            console.error(`Erro ao buscar dados de ${type}:`, error);
            showToast(`Falha ao carregar dados de ${type}.`, true);
        }
    };

    const renderUsersTable = (data) => {
        const rows = data.slice(1);
        usersTableBody.innerHTML = '';
        rows.forEach(rowData => {
            const tr = document.createElement('tr');
            tr.className = "bg-white even:bg-slate-50";
            rowData.forEach(cellData => {
                const td = document.createElement('td');
                td.className = "px-4 py-2 border-t border-slate-200";
                td.textContent = cellData;
                td.setAttribute('contenteditable', 'true');
                tr.appendChild(td);
            });
            tr.appendChild(createActionsCell(tr, 'users'));
            usersTableBody.appendChild(tr);
        });
    };

    const renderClientsTable = (data) => {
        clientDataHeaders = data[0] || [];
        let rows = data.slice(1);
        
        if (currentUser.profile === 'Editor') {
            const referenceNameIndex = clientDataHeaders.map(h => h.toLowerCase()).indexOf('referencename');
            if (referenceNameIndex !== -1) {
                rows = rows.filter(row => row[referenceNameIndex] === currentUser.username);
            }
        }

        clientsTableHead.innerHTML = '';
        const headerRow = document.createElement('tr');
        clientDataHeaders.forEach(headerText => {
            const th = document.createElement('th');
            th.className = "px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider";
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        const thAction = document.createElement('th');
        thAction.textContent = "Ações";
        thAction.className = "px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider";
        headerRow.appendChild(thAction);
        clientsTableHead.appendChild(headerRow);

        clientsTableBody.innerHTML = '';
        rows.forEach(rowData => {
            const tr = document.createElement('tr');
            tr.className = "bg-white even:bg-slate-50";
            rowData.forEach((cellData, cellIndex) => {
                const td = document.createElement('td');
                td.className = "px-4 py-2 border-t border-slate-200";
                td.textContent = cellData;
                if (EDITABLE_CLIENT_COLUMNS.includes(cellIndex)) {
                    td.setAttribute('contenteditable', 'true');
                }
                tr.appendChild(td);
            });
            tr.appendChild(createActionsCell(tr, 'clients'));
            clientsTableBody.appendChild(tr);
        });
    };
    
    const createActionsCell = (row, type) => {
        const td = document.createElement('td');
        td.className = "px-4 py-2 border-t border-slate-200";
        if (currentUser.profile === 'Administrador' || (type === 'clients' && currentUser.profile === 'Editor')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'text-red-500 hover:text-red-700 text-xs';
            deleteBtn.onclick = () => {
                row.remove();
                showToast("Linha removida. Salve para confirmar.");
            };
            td.appendChild(deleteBtn);
        }
        return td;
    };
    
    const addRow = (tbody, colCount) => {
        if (colCount === 0) return;
        const tr = document.createElement('tr');
        tr.className = "bg-white even:bg-slate-50";
        for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.className = "px-4 py-2 border-t border-slate-200";
            td.setAttribute('contenteditable', 'true');
            tr.appendChild(td);
        }
        tr.appendChild(createActionsCell(tr));
        tbody.appendChild(tr);
    };
    
    const getTableData = (tbody, headers) => {
        const data = [headers];
        tbody.querySelectorAll('tr').forEach(tr => {
            const rowData = [];
            tr.querySelectorAll('td[contenteditable]').forEach(td => {
                rowData.push(td.textContent.trim());
            });
            if (rowData.length > 0) {
               data.push(rowData);
            }
        });
        return data;
    };
    
    const getClientTableDataForSave = () => {
        const data = [clientDataHeaders];
        clientsTableBody.querySelectorAll('tr').forEach(tr => {
            const rowData = [];
            tr.querySelectorAll('td').forEach(td => {
                if(!td.querySelector('button')) {
                    rowData.push(td.textContent.trim());
                }
            });
            if(rowData.length > 0) data.push(rowData);
        });
        return data;
    };


    const saveChanges = async (type) => {
        const button = type === 'users' ? saveUsersBtn : saveClientsBtn;
        setButtonLoading(button, true);
        
        let tableData;
        if (type === 'users') {
            tableData = getTableData(usersTableBody, ["usuario", "senha", "perfil"]);
        } else {
            tableData = getClientTableDataForSave();
        }

        const payload = {
            action: `update${type.charAt(0).toUpperCase() + type.slice(1)}`,
            user: currentUser.username,
            profile: currentUser.profile,
            data: tableData
        };
        
        try {
            const response = await fetch(googleScriptURL, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
            });
            
            const result = await response.json();
            if (result.result !== 'success') {
                throw new Error(result.message || 'Erro desconhecido no servidor.');
            }
            showToast('Alterações salvas com sucesso!');
        } catch (error) {
            console.error(`Erro ao salvar ${type}:`, error);
            showToast(`Falha ao salvar. ${error.message}`, true);
        } finally {
            setButtonLoading(button, false);
            await fetchAndRenderTable(type);
        }
    };
    
    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    addUserRowBtn.addEventListener('click', () => addRow(usersTableBody, 3));
    addClientRowBtn.addEventListener('click', () => addRow(clientsTableBody, clientDataHeaders.length));
    saveUsersBtn.addEventListener('click', () => saveChanges('users'));
    saveClientsBtn.addEventListener('click', () => {
        confirmationModal.classList.remove('hidden');
    });
    cancelBtn.addEventListener('click', () => confirmationModal.classList.add('hidden'));
    confirmBtn.addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
        saveChanges('clients');
    });
});
