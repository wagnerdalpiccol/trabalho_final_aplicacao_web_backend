// -------------------------------------------------------------
// I. Configurações da API REST (My JSON Server)
// -------------------------------------------------------------

// URLs Reais da API Mock no My JSON Server
const API_BASE_URL = 'https://my-json-server.typicode.com/wagnerdalpiccol/trabalho_final_aplicacao_web_backend';
const PRODUCTS_ENDPOINT = `${API_BASE_URL}/produtos`;
const CART_ENDPOINT = `${API_BASE_URL}/carrinho`;

// Variável para armazenar o catálogo de produtos, buscando apenas uma vez
let CATALOG_DATA = [];

// Função utilitária para formatar valores
const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// -------------------------------------------------------------
// II. Implementação das Chamadas AJAX (Fetch API)
// -------------------------------------------------------------

// Função de utilidade para fetch com tratamento de erro
async function handleFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        console.error(`Falha na requisição para ${url}. Status: ${response.status}`);
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    // Tenta retornar JSON, mas retorna a própria resposta para DELETE (que não tem body)
    return response.status === 204 || response.status === 200 ? response.text().then(text => text ? JSON.parse(text) : {}) : response.json();
}

/**
 * GET /produtos - Busca o catálogo de produtos.
 */
async function fetchProducts() {
    console.log(`[AJAX] GET ${PRODUCTS_ENDPOINT}`);
    return handleFetch(PRODUCTS_ENDPOINT);
}

/**
 * GET /carrinho - Busca os itens do carrinho.
 */
async function fetchCart() {
    console.log(`[AJAX] GET ${CART_ENDPOINT}`);
    return handleFetch(CART_ENDPOINT);
}

/**
 * POST /carrinho (com lógica de PUT embutida se o item já existir)
 * @param {Object} data - Dados do produto a ser adicionado.
 * @returns {Promise<Object>} - Item do carrinho criado ou atualizado.
 */
async function postCartItem(data) {
    const cartItems = await fetchCart();
    // Procura o item no carrinho pelo ID do produto
    const existingItem = cartItems.find(item => item.produtoId === data.produtoId);

    if (existingItem) {
        console.log(`[AJAX] Item já existe, fazendo PUT (aumentando quantidade)...`);
        const newQuantity = existingItem.quantidade + 1;
        // Faz um PUT no item existente
        // Passamos 'true' para isPostLogic para que o PUT não dispare um Toast redundante
        return putCartItem(existingItem.id, newQuantity, existingItem.nomeProduto, true);
    } else {
        console.log(`[AJAX] POST ${CART_ENDPOINT}`);
        const response = await fetch(CART_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, quantidade: 1 })
        });

        if (!response.ok) throw new Error('Falha ao adicionar item.');

        const newItem = await response.json();
        renderCart(); // Atualiza a interface
        showToast(`"${newItem.nomeProduto}" adicionado ao carrinho!`);
        return newItem;
    }
}

/**
 * PUT /carrinho/:id - Atualiza a quantidade de um item no carrinho.
 * @param {string} cartItemId - ID do item no carrinho.
 * @param {number} newQuantity - Nova quantidade.
 * @param {string} itemName - Nome do item para o Toast.
 * @param {boolean} isPostLogic - Indica se a chamada vem do POST (para evitar Toast).
 * @returns {Promise<Object>} - Item do carrinho atualizado.
 */
async function putCartItem(cartItemId, newQuantity, itemName = 'Item', isPostLogic = false) {
    console.log(`[AJAX] PUT ${CART_ENDPOINT}/${cartItemId} com quantidade ${newQuantity}`);

    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
        showToast('A quantidade deve ser um número inteiro positivo!', 'bg-danger');
        // Usamos throw para o .catch() no evento corrigir o valor no input
        throw new Error("Quantidade inválida.");
    }

    const response = await fetch(`${CART_ENDPOINT}/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: quantity }) // Envia apenas a propriedade a ser atualizada
    });

    if (!response.ok) throw new Error('Falha ao atualizar quantidade.');

    renderCart(); // Atualiza a interface
    if (!isPostLogic) {
        showToast(`Quantidade de "${itemName}" atualizada!`, 'bg-info');
    }
    return response.json();
}

/**
 * DELETE /carrinho/:id - Remove um item do carrinho.
 * @param {string} cartItemId - O ID do item do carrinho a ser removido.
 * @param {string} itemName - Nome do item para o Toast.
 * @returns {Promise<void>} - Promessa resolvida após a exclusão.
 */
async function deleteCartItem(cartItemId, itemName) {
    console.log(`[AJAX] DELETE ${CART_ENDPOINT}/${cartItemId}`);

    await handleFetch(`${CART_ENDPOINT}/${cartItemId}`, { method: 'DELETE' });

    renderCart(); // Atualiza a interface
    showToast(`Item "${itemName}" removido do carrinho.`, 'bg-danger');
}

// -------------------------------------------------------------
// III. Funções de Renderização e Manipulação do DOM
// -------------------------------------------------------------

/**
 * Renderiza a lista de produtos na tela (GET /produtos).
 * @param {Array} products - Lista de objetos de produtos.
 */
function renderProducts(products) {
    const $catalog = $('#productCatalog');
    $catalog.empty();

    if (products.length === 0) {
        $catalog.html('<p class="text-center col-12">Nenhum produto encontrado.</p>');
        return;
    }
    
    // Armazena no global para referência rápida nos detalhes e carrinho
    CATALOG_DATA = products; 

    products.forEach(product => {
        const html = `
            <article class="col" data-product-id="${product.id}">
                <div class="product-card shadow-sm">
                    <div class="product-img-container">
                        <img src="${product.imagemUrl}" class="card-img-top" alt="Imagem de ${product.nome}" onerror="this.onerror=null;this.src='https://placehold.co/400x300/a0a0a0/fff?text=Imagem+Indisponível';" loading="lazy">
                    </div>
                    <div class="p-3 d-flex flex-column flex-grow-1">
                        <h3 class="h5 card-title">${product.nome}</h3>
                        <p class="card-text text-muted flex-grow-1">${product.descricao.substring(0, 70)}...</p>
                        <p class="h5 text-danger">${formatCurrency(product.preco)}</p>
                        <div class="d-flex gap-2 mt-2">
                            <button class="btn btn-outline-info btn-sm view-details-btn flex-grow-1" data-id="${product.id}" aria-label="Ver detalhes de ${product.nome}">
                                <i class="fas fa-eye"></i> Detalhes
                            </button>
                            <button class="btn btn-primary btn-sm add-to-cart-btn flex-grow-1" data-id="${product.id}" data-nome="${product.nome}" aria-label="Adicionar ${product.nome} ao carrinho">
                                <i class="fas fa-cart-plus"></i> Comprar
                            </button>
                        </div>
                    </div>
                </div>
            </article>
        `;
        $catalog.append(html);
    });
}

/**
 * Renderiza o conteúdo do modal de detalhes do produto.
 * @param {Object} product - Objeto de produto.
 */
function renderProductDetails(product) {
    const $body = $('#productDetailBody');
    $body.empty();
    
    // Garantir que a descrição esteja completa no Modal
    const fullProduct = CATALOG_DATA.find(p => p.id === product.id) || product; 

    const html = `
        <div class="row">
            <figure class="col-md-5">
                <img src="${fullProduct.imagemUrl}" class="img-fluid rounded shadow-sm" alt="Imagem de ${fullProduct.nome}">
                <figcaption class="text-center text-muted mt-2">${fullProduct.categoria || 'Móvel'}</figcaption>
            </figure>
            <div class="col-md-7">
                <h3 class="h4 text-primary">${fullProduct.nome}</h3>
                <p class="text-muted small">${fullProduct.descricao}</p>
                <p class="h3 text-danger mb-4">${formatCurrency(fullProduct.preco)}</p>
                
                <div class="d-grid gap-2">
                    <button class="btn btn-primary btn-lg add-to-cart-btn" data-id="${fullProduct.id}" data-nome="${fullProduct.nome}" aria-label="Adicionar ${fullProduct.nome} ao carrinho">
                        <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        </div>
    `;
    $body.html(html);
}

/**
 * Renderiza o carrinho (GET /carrinho) e atualiza o total.
 */
async function renderCart() {
    try {
        const cartItems = await fetchCart();
        const $container = $('#cartItemsContainer');
        $container.empty();

        let total = 0;

        if (cartItems.length === 0) {
            $('#emptyCartMessage').show();
            $('#cartTotalValue').text(formatCurrency(0));
            $('#cartItemCount').text(0);
            return;
        }

        $('#emptyCartMessage').hide();

        cartItems.forEach(item => {
            const subtotal = item.precoUnitario * item.quantidade;
            total += subtotal;
            
            // Tenta buscar a imagem do CATALOG_DATA para exibição
            const productRef = CATALOG_DATA.find(p => p.id === item.produtoId);
            const imageUrl = productRef ? productRef.imagemUrl : 'https://placehold.co/80x60/a0a0a0/fff?text=Móvel';

            const html = `
                <article class="cart-item d-flex align-items-center justify-content-between" data-cart-id="${item.id}">
                    <div class="d-flex align-items-center flex-grow-1">
                        <div style="width: 80px;">
                            <img src="${imageUrl}" class="img-fluid rounded" alt="Imagem de ${item.nomeProduto}">
                        </div>
                        <div class="ms-3">
                            <h4 class="h6 mb-0">${item.nomeProduto}</h4>
                            <small class="text-muted">Unitário: ${formatCurrency(item.precoUnitario)}</small>
                        </div>
                    </div>

                    <div class="cart-quantity-control d-flex align-items-center mx-3" role="group" aria-label="Controle de quantidade para ${item.nomeProduto}">
                        <button class="btn btn-sm btn-outline-primary quantity-btn" data-action="decrease" data-id="${item.id}" data-nome="${item.nomeProduto}" aria-label="Diminuir quantidade">-</button>
                        <input type="number" class="form-control form-control-sm quantity-input" value="${item.quantidade}" min="1" data-id="${item.id}" data-nome="${item.nomeProduto}" aria-label="Quantidade atual">
                        <button class="btn btn-sm btn-outline-primary quantity-btn" data-action="increase" data-id="${item.id}" data-nome="${item.nomeProduto}" aria-label="Aumentar quantidade">+</button>
                    </div>

                    <div class="text-end">
                        <p class="mb-0 fw-bold">${formatCurrency(subtotal)}</p>
                    </div>

                    <button class="btn btn-sm btn-outline-danger ms-4 delete-cart-item" data-id="${item.id}" data-name="${item.nomeProduto}" aria-label="Remover ${item.nomeProduto} do carrinho">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </article>
            `;
            $container.append(html);
        });

        // Atualiza o total e o contador no cabeçalho
        $('#cartTotalValue').text(formatCurrency(total));
        $('#cartItemCount').text(cartItems.reduce((acc, item) => acc + item.quantidade, 0));

    } catch (error) {
        console.error("Erro ao renderizar carrinho:", error);
        showToast('Erro ao carregar o carrinho. Verifique sua URL da API.', 'bg-danger');
    }
}

/**
 * Exibe uma notificação Toast.
 * @param {string} message - Mensagem a ser exibida.
 * @param {string} bgClass - Classe de cor do Bootstrap.
 */
function showToast(message, bgClass = 'bg-success') {
    const toastElement = document.getElementById('liveToast');
    const toast = bootstrap.Toast.getOrCreateInstance(toastElement);

    $('#liveToast .toast-header').removeClass('bg-success bg-info bg-danger').addClass(bgClass);
    $('#toastMessage').text(message);

    toast.show();
}

// -------------------------------------------------------------
// IV. Tratamento de Eventos (Event Listeners e Handlers)
// -------------------------------------------------------------

$(document).ready(function () {
    // 1. Inicializa o Catálogo (GET /produtos)
    fetchProducts()
        .then(renderProducts)
        .catch(err => {
            console.error("Falha ao carregar produtos:", err);
            $('#productCatalog').html('<p class="text-center col-12 text-danger">Falha ao carregar o catálogo de produtos da API.</p>');
        });

    // 2. Abre o Modal do Carrinho e Renderiza (GET /carrinho)
    $('#cartButton').on('click', renderCart);

    // 3. Handler para ver detalhes do produto
    $('#productCatalog, #productDetailBody').on('click', '.view-details-btn', function () {
        const productId = $(this).data('id');
        const product = CATALOG_DATA.find(p => p.id === productId);

        if (product) {
            renderProductDetails(product);
            const detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            detailModal.show();
        } else {
            showToast('Produto não encontrado no catálogo.', 'bg-danger');
        }
    });

    // 4. Handler para Adicionar ao Carrinho (POST/PUT /carrinho)
    $('#productCatalog, #productDetailBody').on('click', '.add-to-cart-btn', async function () {
        const productId = $(this).data('id');
        const productName = $(this).data('nome');
        const product = CATALOG_DATA.find(p => p.id === productId);

        if (product) {
            // Prepara os dados conforme o schema do /carrinho
            const cartItemData = {
                produtoId: product.id,
                nomeProduto: product.nome,
                precoUnitario: product.preco,
            };

            // Chamada POST (que pode virar PUT, veja a função postCartItem)
            await postCartItem(cartItemData);
        }
    });

    // 5. Handler para Atualizar Quantidade (PUT /carrinho/:id)
    $('#cartItemsContainer').on('click', '.quantity-btn', async function () {
        const $btn = $(this);
        const cartItemId = $btn.data('id');
        const itemName = $btn.data('nome');
        const action = $btn.data('action');
        const $input = $(`#cartItemsContainer input.quantity-input[data-id="${cartItemId}"]`);
        let newQuantity = parseInt($input.val(), 10);

        if (action === 'increase') {
            newQuantity += 1;
        } else if (action === 'decrease' && newQuantity > 1) {
            newQuantity -= 1;
        } else {
            return;
        }

        $input.val(newQuantity); // Atualiza a UI imediatamente

        // Chamada PUT (Atualização)
        putCartItem(cartItemId, newQuantity, itemName)
            .catch(() => {
                // Em caso de falha (ex: quantidade inválida), re-renderiza para corrigir o valor
                renderCart();
            });
    });

    // 6. Handler para entrada manual de quantidade (Validação de Formulário e PUT)
    $('#cartItemsContainer').on('change', '.quantity-input', async function () {
        const $input = $(this);
        const cartItemId = $input.data('id');
        const itemName = $input.data('nome');
        const newQuantity = $input.val();

        // Chamada PUT (Atualização)
        putCartItem(cartItemId, newQuantity, itemName)
            .catch(() => {
                // Se o PUT falhar, re-renderiza para corrigir o valor na UI
                renderCart();
            });
    });

    // 7. Handler para Remover Item (DELETE /carrinho/:id)
    $('#cartItemsContainer').on('click', '.delete-cart-item', async function () {
        const cartItemId = $(this).data('id');
        const itemName = $(this).data('name');

        if (window.confirm(`Tem certeza que deseja remover "${itemName}" do carrinho?`)) {
            // Chamada DELETE
            await deleteCartItem(cartItemId, itemName);
        }
    });
});