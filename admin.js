// Aguarda o carregamento completo da página antes de executar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- SELEÇÃO DE ELEMENTOS DO DOM ---
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
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

    // Em uma aplicação real, isso viria de um banco de dados seguro.
    const hardcodedUsers = {
        "2500": { password: "7579", profile: "Administrador" },
        "2501": { password: "0166", profile: "Editor" },
        "2502": { password: "7041", profile: "Editor" },
        "2503": { password: "ABC123", profile: "Editor" }
    };

    let currentUser = null;
    let clientDataHeaders = [];
    
    // --- FUNÇÕES ---

    // Exibe notificações (toast)
    const showToast = (message, isError = false) => {
        toastMessage.textContent = message;
        toast.className = 'fixed bottom-5 right-5 text-white py-2 px-5 rounded-lg shadow-lg transition-opacity duration-300'; // Reset classes
        if (isError) {
            toast.classList.add('bg-red-600');
        } else {
            toast.classList.add('bg-slate-800');
        }
        toast.classList.add('opacity-100');
        setTimeout(() => {
            toast.classList.remove('opacity-100');
        }, 3000);
    };
    
    // Controla o estado de "carregando" dos botões
    const setButtonLoading = (button, isLoading) => {
        const btnText = button.querySelector('.btn-text');
        const loader = button.querySelector('.loader-sm');
        if (isLoading) {
            btnText.classList.add('hidden');
            loader.classList.remove('hidden');
            button.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
            button.disabled = false;
        }
    };
    
    // Função de Login
    const handleLogin = (e) => {
        e.preventDefault();
        const username = usernameInput.value;
        const password = passwordInput.value;
        const user = hardcodedUsers[username];

        if (user && user.password === password) {
            currentUser = { username, ...user };
            loginScreen.classList.add('hidden');
            mainContent.classList.remove('hidden');
            userProfileName.textContent = currentUser.profile;
            initializeDashboard();
        } else {
            loginError.classList.remove('hidden');
        }
    };

    // Função de Logout
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

    // Inicializa o painel com base no perfil do usuário
    const initializeDashboard = async () => {
        if (currentUser.profile === 'Administrador') {
            usersSection.classList.remove('hidden');
            await fetchAndRenderTable('users');
        } else {
            usersSection.classList.add('hidden'); 
        }
        await fetchAndRenderTable('clients');
    };

    // Busca e renderiza os dados das tabelas
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
                renderTable(usersTableBody, data.slice(1), true);
            } else if (type === 'clients') {
                clientDataHeaders = data[0] || [];
                renderTable(clientsTableBody, data.slice(1), true, clientDataHeaders);
            }
        } catch (error) {
            console.error(`Erro ao buscar dados de ${type}:`, error);
            showToast(`Falha ao carregar dados de ${type}.`, true);
        }
    };

    // Renderiza uma tabela genérica
    const renderTable = (tbody, data, isEditable = true, headers = null) => {
        tbody.innerHTML = '';
        if (headers) {
           clientsTableHead.innerHTML = ''; // Limpa o cabeçalho de clientes apenas se for renderizar clientes
        }
        
        if (headers && headers.length > 0) {
            const headerRow = document.createElement('tr');
            headers.forEach(headerText => {
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
        }

        data.forEach((rowData) => {
            const tr = document.createElement('tr');
            tr.className = "bg-white even:bg-slate-50";
            rowData.forEach((cellData) => {
                const td = document.createElement('td');
                td.className = "px-4 py-2 border-t border-slate-200";
                td.textContent = cellData;
                if (isEditable) {
                    td.setAttribute('contenteditable', 'true');
                }
                tr.appendChild(td);
            });
            tr.appendChild(createActionsCell(tr));
            tbody.appendChild(tr);
        });
    };
    
    // Cria a célula de ações (excluir)
    const createActionsCell = (row) => {
        const td = document.createElement('td');
        td.className = "px-4 py-2 border-t border-slate-200";
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Excluir';
        deleteBtn.className = 'text-red-500 hover:text-red-700 text-xs';
        deleteBtn.onclick = () => {
            row.remove();
            showToast("Linha removida. Salve para confirmar.");
        };
        td.appendChild(deleteBtn);
        return td;
    };
    
    // Adiciona uma nova linha em branco na tabela
    const addRow = (tbody, colCount) => {
        if (colCount === 0) {
            showToast("Não é possível adicionar linha sem cabeçalhos carregados.", true);
            return;
        }
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
    
    // Lê os dados da tabela HTML e converte para um array 2D
    const getTableData = (tbody, headers = []) => {
        const data = [];
        if (headers.length > 0) {
            data.push(headers);
        }
        tbody.querySelectorAll('tr').forEach(tr => {
            const rowData = [];
            tr.querySelectorAll('td[contenteditable="true"]').forEach(td => {
                rowData.push(td.textContent.trim());
            });
            if (rowData.length > 0) {
               data.push(rowData);
            }
        });
        return data;
    };

    // Salva as alterações (usuários ou clientes)
    const saveChanges = async (type) => {
        const button = type === 'users' ? saveUsersBtn : saveClientsBtn;
        setButtonLoading(button, true);

        const tableBody = type === 'users' ? usersTableBody : clientsTableBody;
        const headers = type === 'users' ? ["usuario", "senha", "perfil"] : clientDataHeaders;
        const tableData = getTableData(tableBody, headers);
        
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

            if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Erro do servidor: ${response.status} ${errorText}`);
            }
            
            const result = await response.json();
            if (result.result !== 'success') {
                throw new Error(result.message || 'Ocorreu um erro desconhecido no servidor.');
            }
            
            showToast('Alterações salvas com sucesso!');
            await fetchAndRenderTable(type); // Espera o recarregamento
        } catch (error) {
            console.error(`Erro ao salvar ${type}:`, error);
            showToast(`Falha ao salvar. ${error.message}`, true);
        } finally {
            setButtonLoading(button, false);
        }
    };
    
    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    addUserRowBtn.addEventListener('click', () => addRow(usersTableBody, 3));
    addClientRowBtn.addEventListener('click', () => addRow(clientsTableBody, clientDataHeaders.length));
    
    saveUsersBtn.addEventListener('click', () => saveChanges('users'));
    
    saveClientsBtn.addEventListener('click', () => {
        if (currentUser.profile === 'Editor') {
            confirmationModal.classList.remove('hidden');
        } else {
            saveChanges('clients');
        }
    });
    
    cancelBtn.addEventListener('click', () => confirmationModal.classList.add('hidden'));
    confirmBtn.addEventListener('click', () => {
        confirmationModal.classList.add('hidden');
        saveChanges('clients');
    });
});
