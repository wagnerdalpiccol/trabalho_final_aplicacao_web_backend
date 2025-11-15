// Variáveis globais para simular o back-end
const API_BASE_URL = 'http://api.simulado.com'; // URL base para simular o fetch
let CART = {}; // Objeto que simula o recurso /cart. Chave: produtoId, Valor: {id, produtoId, nomeProduto, precoUnitario, quantidade}
let nextCartItemId = 1;

// Catálogo Estático Simulado (/produtos)
const PRODUCTS_CATALOG = [
    { id: "1", nome: "Cadeira de Escritório Ergonômica", descricao: "Cadeira giratória com ajuste de altura, apoio lombar e braços 4D. Ideal para longas horas de trabalho.", preco: 459.90, imagemUrl: "https://placehold.co/400x300/e0e7ff/000?text=Cadeira+Ergo", categoria: "Cadeira" },
    { id: "2", nome: "Mesa para Computador em L", descricao: "Mesa espaçosa em formato L, perfeita para setups de múltiplos monitores. Estrutura metálica.", preco: 989.50, imagemUrl: "https://placehold.co/400x300/ffe0e0/000?text=Mesa+em+L", categoria: "Mesa" },
    { id: "3", nome: "Armário Alto com 4 Prateleiras", descricao: "Armário de escritório alto com portas de correr e 4 prateleiras internas ajustáveis.", preco: 650.00, imagemUrl: "https://placehold.co/400x300/d4edda/000?text=Armario+4P", categoria: "Armário" },
    { id: "4", nome: "Gaveteiro Volante 3 Gavetas", descricao: "Gaveteiro volante com chave e rodízios, três gavetas. Perfeito para organização sob a mesa.", preco: 219.90, imagemUrl: "https://placehold.co/400x300/fff3cd/000?text=Gaveteiro+Volante", categoria: "Gaveteiro" },
    { id: "5", nome: "Poltrona para Sala de Estar", descricao: "Poltrona moderna com estofamento em veludo. Conforto e design para sua sala.", preco: 799.00, imagemUrl: "https://placehold.co/400x300/cff4fc/000?text=Poltrona+Veludo", categoria: "Cadeira" },
];

// Função utilitária para formatar valores
const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// -------------------------------------------------------------
// I. Implementação das Chamadas AJAX (Simuladas)
// -------------------------------------------------------------

/**
 * Simula o GET /produtos - Busca o catálogo de produtos.
 * @param {string} endpoint - O endpoint a ser simulado (ex: '/produtos').
 * @returns {Promise<Array>} - Promessa com a lista de produtos.
 */
async function fetchProducts(endpoint) {
    console.log(`[AJAX SIMULADO] GET ${endpoint}`);
    // Simula o tempo de latência da rede
    await new Promise(resolve => setTimeout(resolve, 300));

    if (endpoint.startsWith('/produtos')) {
        // Simulação de GET /produtos (Catálogo Estático)
        return PRODUCTS_CATALOG;
    }
    throw new Error("Endpoint não reconhecido na simulação de GET.");
}

/**
 * Simula o GET /cart - Busca os itens do carrinho.
 * @param {string} endpoint - O endpoint a ser simulado (ex: '/cart').
 * @returns {Promise<Array>} - Promessa com a lista de itens no carrinho.
 */
async function fetchCart(endpoint) {
    console.log(`[AJAX SIMULADO] GET ${endpoint}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    if (endpoint === '/cart') {
        // Simulação de GET /cart
        return Object.values(CART);
    }
    throw new Error("Endpoint não reconhecido na simulação de GET.");
}

/**
 * Simula POST /cart - Adiciona um novo item ao carrinho.
 * @param {string} endpoint - '/cart'
 * @param {Object} data - Dados do novo item (produto).
 * @returns {Promise<Object>} - Item do carrinho criado (com ID).
 */
async function postCartItem(endpoint, data) {
    console.log(`[AJAX SIMULADO] POST ${endpoint}`, data);
    await new Promise(resolve => setTimeout(resolve, 300));

    if (endpoint === '/cart') {
        const existingItem = CART[data.produtoId];

        if (existingItem) {
            // Se o item já existe, simula um PUT (atualização de quantidade)
            existingItem.quantidade += 1;
            renderCart(); // Atualiza a interface
            showToast('Quantidade atualizada no carrinho!', 'bg-info');
            return existingItem;
        } else {
            // Cria um novo item no carrinho
            const newItem = {
                id: `cart${nextCartItemId++}`,
                createdAt: Date.now(),
                ...data,
                quantidade: 1
            };
            CART[data.produtoId] = newItem;
            renderCart(); // Atualiza a interface
            showToast('Produto adicionado ao carrinho!');
            return newItem;
        }
    }
    throw new Error("Endpoint não reconhecido na simulação de POST.");
}

/**
 * Simula PUT /cart/:id - Atualiza a quantidade de um item no carrinho.
 * @param {string} cartItemId - ID do item no carrinho (ex: 'cart1').
 * @param {number} newQuantity - Nova quantidade.
 * @returns {Promise<Object>} - Item do carrinho atualizado.
 */
async function putCartItem(cartItemId, newQuantity) {
    console.log(`[AJAX SIMULADO] PUT /cart/${cartItemId} com quantidade ${newQuantity}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Encontra o item pelo ID do carrinho
    const cartItemKey = Object.keys(CART).find(key => CART[key].id === cartItemId);
    const item = CART[cartItemKey];

    if (item) {
        // Validação de formulário: a quantidade deve ser um número inteiro positivo
        const quantity = parseInt(newQuantity, 10);
        if (isNaN(quantity) || quantity <= 0) {
            // Caso a validação falhe, retorna um erro e não atualiza
            showToast('A quantidade deve ser um número inteiro positivo!', 'bg-danger');
            return Promise.reject(new Error("Quantidade inválida."));
        }

        item.quantidade = quantity;
        renderCart(); // Atualiza a interface
        showToast('Quantidade no carrinho atualizada!', 'bg-info');
        return item;
    }
    throw new Error("Item do carrinho não encontrado na simulação de PUT.");
}

/**
 * Simula DELETE /cart/:id - Remove um item do carrinho.
 * @param {string} cartItemId - O ID do item do carrinho a ser removido.
 * @returns {Promise<void>} - Promessa resolvida após a exclusão.
 */
async function deleteCartItem(cartItemId) {
    console.log(`[AJAX SIMULADO] DELETE /cart/${cartItemId}`);
    await new Promise(resolve => setTimeout(resolve, 300));

    // Encontra e remove o item pelo ID do carrinho
    const cartItemKey = Object.keys(CART).find(key => CART[key].id === cartItemId);
    
    if (cartItemKey) {
        const itemNome = CART[cartItemKey].nomeProduto; // Obtém o nome antes de deletar
        delete CART[cartItemKey];
        renderCart(); // Atualiza a interface
        showToast(`Item "${itemNome}" removido do carrinho.`, 'bg-danger');
        return;
    }
    throw new Error("Item do carrinho não encontrado na simulação de DELETE.");
}

// -------------------------------------------------------------
// II. Funções de Renderização e Manipulação do DOM
// -------------------------------------------------------------

/**
 * Renderiza a lista de produtos na tela (GET /produtos).
 * @param {Array} products - Lista de objetos de produtos.
 */
function renderProducts(products) {
    const $catalog = $('#productCatalog');
    $catalog.empty(); // Limpa antes de renderizar

    if (products.length === 0) {
        $catalog.html('<p class="text-center col-12">Nenhum produto encontrado.</p>');
        return;
    }

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
                                    <button class="btn btn-primary btn-sm add-to-cart-btn flex-grow-1" data-id="${product.id}" aria-label="Adicionar ${product.nome} ao carrinho">
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

    const html = `
                <div class="row">
                    <figure class="col-md-5">
                        <img src="${product.imagemUrl}" class="img-fluid rounded shadow-sm" alt="Imagem de ${product.nome}">
                        <figcaption class="text-center text-muted mt-2">${product.categoria}</figcaption>
                    </figure>
                    <div class="col-md-7">
                        <h3 class="h4 text-primary">${product.nome}</h3>
                        <p class="text-muted small">${product.descricao}</p>
                        <p class="h3 text-danger mb-4">${formatCurrency(product.preco)}</p>
                        
                        <div class="d-grid gap-2">
                            <button class="btn btn-primary btn-lg add-to-cart-btn" data-id="${product.id}" aria-label="Adicionar ${product.nome} ao carrinho">
                                <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            `;
    $body.html(html);
}

/**
 * Renderiza o carrinho (GET /cart) e atualiza o total.
 */
async function renderCart() {
    try {
        const cartItems = await fetchCart('/cart');
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

            const html = `
                        <article class="cart-item d-flex align-items-center justify-content-between" data-cart-id="${item.id}">
                            <div class="d-flex align-items-center flex-grow-1">
                                <div style="width: 80px;">
                                    <img src="${PRODUCTS_CATALOG.find(p => p.id === item.produtoId)?.imagemUrl || 'https://placehold.co/80x60/a0a0a0/fff?text=Móvel'}" class="img-fluid rounded" alt="Imagem de ${item.nomeProduto}">
                                </div>
                                <div class="ms-3">
                                    <h4 class="h6 mb-0">${item.nomeProduto}</h4>
                                    <small class="text-muted">Unitário: ${formatCurrency(item.precoUnitario)}</small>
                                </div>
                            </div>

                            <div class="cart-quantity-control d-flex align-items-center mx-3" role="group" aria-label="Controle de quantidade para ${item.nomeProduto}">
                                <button class="btn btn-sm btn-outline-primary quantity-btn" data-action="decrease" data-id="${item.id}" aria-label="Diminuir quantidade">-</button>
                                <input type="number" class="form-control form-control-sm quantity-input" value="${item.quantidade}" min="1" data-id="${item.id}" aria-label="Quantidade atual">
                                <button class="btn btn-sm btn-outline-primary quantity-btn" data-action="increase" data-id="${item.id}" aria-label="Aumentar quantidade">+</button>
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
        showToast('Erro ao carregar o carrinho.', 'bg-danger');
    }
}

/**
 * Exibe uma notificação Toast.
 * @param {string} message - Mensagem a ser exibida.
 * @param {string} bgClass - Classe de cor do Bootstrap (ex: 'bg-success', 'bg-info', 'bg-danger').
 */
function showToast(message, bgClass = 'bg-success') {
    const toastElement = document.getElementById('liveToast');
    const toast = new bootstrap.Toast(toastElement);

    $('#liveToast .toast-header').removeClass('bg-success bg-info bg-danger').addClass(bgClass);
    $('#toastMessage').text(message);

    toast.show();
}

// -------------------------------------------------------------
// III. Tratamento de Eventos (Event Listeners e Handlers)
// -------------------------------------------------------------

$(document).ready(function () {
    // 1. Inicializa o Catálogo (Simulação de GET /produtos)
    fetchProducts('/produtos')
        .then(renderProducts)
        .catch(err => console.error("Falha ao carregar produtos:", err));

    // 2. Abre o Modal do Carrinho e Renderiza (Simulação de GET /cart)
    $('#cartButton').on('click', renderCart);

    // 3. Handler para ver detalhes do produto
    $('#productCatalog, #productDetailBody').on('click', '.view-details-btn', function () {
        const productId = $(this).data('id');
        const product = PRODUCTS_CATALOG.find(p => p.id === productId);

        if (product) {
            renderProductDetails(product);
            const detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            detailModal.show();
        } else {
            showToast('Produto não encontrado.', 'bg-danger');
        }
    });

    // 4. Handler para Adicionar ao Carrinho (POST /cart)
    $('#productCatalog, #productDetailBody').on('click', '.add-to-cart-btn', async function () {
        const productId = $(this).data('id');
        const product = PRODUCTS_CATALOG.find(p => p.id === productId);

        if (product) {
            // Prepara os dados conforme o schema do /cart
            const cartItemData = {
                produtoId: product.id,
                nomeProduto: product.nome,
                precoUnitario: product.preco,
            };

            // Simula a chamada POST
            await postCartItem('/cart', cartItemData);
        }
    });

    // 5. Handler para Atualizar Quantidade (PUT /cart/:id)
    $('#cartItemsContainer').on('click', '.quantity-btn', async function () {
        const $btn = $(this);
        const cartItemId = $btn.data('id');
        const action = $btn.data('action');
        const $input = $(`#cartItemsContainer input.quantity-input[data-id="${cartItemId}"]`);
        let newQuantity = parseInt($input.val(), 10);

        if (action === 'increase') {
            newQuantity += 1;
        } else if (action === 'decrease' && newQuantity > 1) {
            newQuantity -= 1;
        } else {
            return; // Não diminui para zero
        }

        $input.val(newQuantity); // Atualiza a UI imediatamente para feedback rápido

        // Simula a chamada PUT (Atualização)
        putCartItem(cartItemId, newQuantity)
            .catch(() => {
                // Em caso de falha, re-renderiza para corrigir o valor
                renderCart();
            });
    });

    // 6. Handler para entrada manual de quantidade (Validação de Formulário e PUT)
    $('#cartItemsContainer').on('change', '.quantity-input', async function () {
        const $input = $(this);
        const cartItemId = $input.data('id');
        const newQuantity = $input.val();

        // Simula a chamada PUT (Atualização)
        putCartItem(cartItemId, newQuantity)
            .catch(() => {
                // Se o PUT falhar (ex: quantidade inválida), re-renderiza para corrigir o valor na UI
                renderCart();
            });
    });

    // 7. Handler para Remover Item (DELETE /cart/:id)
    $('#cartItemsContainer').on('click', '.delete-cart-item', async function () {
        const cartItemId = $(this).data('id');
        const itemName = $(this).data('name');

        // Simulação de Modal de Confirmação (Substituindo alert/confirm)
        if (window.confirm(`Tem certeza que deseja remover "${itemName}" do carrinho?`)) {
            // Simula a chamada DELETE
            await deleteCartItem(cartItemId);
        }
    });
});

// -------------------------------------------------------------
// IV. Validação de Formulário (Embutida no PUT)
// A validação para o PUT (quantidade > 0) está implementada na função putCartItem.
// O POST não requer validação de formulário complexa, pois apenas adiciona o produto por ID.
// -------------------------------------------------------------