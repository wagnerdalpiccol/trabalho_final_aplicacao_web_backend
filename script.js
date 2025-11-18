// URLs Reais da API Mock no MOCKAPI.IO
const API_BASE_URL = 'https://6918919621a9635948707c45.mockapi.io';
const PRODUCTS_ENDPOINT = `${API_BASE_URL}/produtos`;
const CART_ENDPOINT = `${API_BASE_URL}/carrinho`;

// Variável para armazenar o catálogo de produtos, buscando apenas uma vez
let CATALOG_DATA = [];

// Função utilitária para formatar valores
const formatCurrency = (value) => `R$ ${value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

// -------------------------------------------------------------
// I. Implementação das Chamadas AJAX (Fetch API)
// -------------------------------------------------------------

// Função de utilidade para fetch com tratamento de erro
async function handleFetch(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        console.error(`Falha na requisição para ${url}. Status: ${response.status}`);
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    // Tenta retornar JSON, mas retorna a própria resposta para DELETE (que pode não ter body)
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
 */
async function postCartItemWithQuantity(data, selectedQuantity) {
    const cartItems = await fetchCart();
    // Procura o item no carrinho pelo ID do produto
    const existingItem = cartItems.find(item => item.produtoId === data.produtoId);

    if (existingItem) {
        console.log(`[AJAX] Item já existe, fazendo PUT (somando quantidade)...`);
        const newQuantity = existingItem.quantidade + selectedQuantity;
        return putCartItem(existingItem.id, newQuantity, existingItem.nomeProduto, true); 
    } else {
        console.log(`[AJAX] POST ${CART_ENDPOINT}`);
        const response = await fetch(CART_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, quantidade: selectedQuantity }) // Usa a quantidade selecionada
        });
        if (!response.ok) throw new Error('Falha ao adicionar item.');
        
        const newItem = await response.json();
        renderCart();
        showToast(`${selectedQuantity}x "${newItem.nomeProduto}" adicionado ao carrinho!`);
        return newItem;
    }
}

/**
 * PUT /carrinho/:id - Atualiza a quantidade de um item no carrinho.
 */
async function putCartItem(cartItemId, newQuantity, itemName = 'Item', isPostLogic = false) {
    console.log(`[AJAX] PUT ${CART_ENDPOINT}/${cartItemId} com quantidade ${newQuantity}`);

    const quantity = parseInt(newQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
        showToast('A quantidade deve ser um número inteiro positivo!', 'bg-danger');
        throw new Error("Quantidade inválida.");
    }

    const response = await fetch(`${CART_ENDPOINT}/${cartItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade: quantity })
    });

    if (!response.ok) throw new Error('Falha ao atualizar quantidade.');

    renderCart();
    if (!isPostLogic) {
        showToast(`Quantidade de "${itemName}" atualizada!`, 'bg-info');
    }
    return response.json();
}

/**
 * DELETE /carrinho/:id - Remove um item do carrinho.
 */
async function deleteCartItem(cartItemId, itemName) {
    console.log(`[AJAX] DELETE ${CART_ENDPOINT}/${cartItemId}`);

    await handleFetch(`${CART_ENDPOINT}/${cartItemId}`, { method: 'DELETE' });

    renderCart();
    showToast(`Item "${itemName}" removido do carrinho.`, 'bg-danger');
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
    $catalog.empty();

    if (products.length === 0) {
        $catalog.html('<p class="text-center col-12">Nenhum produto encontrado.</p>');
        return;
    }
    
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
                        <p class="card-text text-muted flex-grow-1">${(product.descricao || 'Descrição indisponível').substring(0, 70)}...</p>
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

    const activeCategory = $('#categoryFilters button.btn-dark').data('category');
    if (activeCategory) {
        $('#categoryFilters button.filter-btn').removeClass('btn-dark').addClass('btn-outline-dark');
        $(`#categoryFilters button[data-category="${activeCategory}"]`).removeClass('btn-outline-dark').addClass('btn-dark');
    }
}

/**
 * Renderiza o conteúdo do modal de detalhes do produto OU de compra.
 */
function renderProductDetails(product, showQuantityControl = false) {
    const $body = $('#productDetailBody');
    $body.empty();
    
    // Busca o produto completo no catálogo para garantir todas as propriedades
    const fullProduct = CATALOG_DATA.find(p => p.id === product.id) || product; 
    
    // Conteúdo HTML do Modal
    let html = `
        <div class="row">
            <figure class="col-md-5">
                <img src="${fullProduct.imagemUrl}" class="img-fluid rounded shadow-sm" alt="Imagem de ${fullProduct.nome}">
                <figcaption class="text-center text-muted mt-2">${fullProduct.categoria || 'Móvel'}</figcaption>
            </figure>
            <div class="col-md-7">
                <h3 class="h4 text-primary">${fullProduct.nome}</h3>
                <p class="text-muted small">${fullProduct.descricao || 'Descrição detalhada não disponível.'}</p>
                <p class="h3 text-danger mb-4">${formatCurrency(fullProduct.preco)}</p>
    `;
    
    if (showQuantityControl) {
        // Bloco de controle de quantidade para o POST/PUT
        html += `
            <div class="mb-4">
                <label for="quantityInput" class="form-label fw-bold">Selecione a Quantidade:</label>
                <input type="number" class="form-control form-control-lg" id="quantityInput" value="1" min="1" required aria-label="Quantidade a ser adicionada ao carrinho">
                <span id="quantityError" class="text-danger small mt-1" style="display: none;"></span>
            </div>
            <div class="d-grid gap-2">
                <button class="btn btn-success btn-lg confirm-add-to-cart-btn"
                    data-id="${fullProduct.id}" 
                    data-nome="${fullProduct.nome}"
                    data-preco="${fullProduct.preco}"
                    aria-label="Confirmar adição de ${fullProduct.nome} ao carrinho">
                    <i class="fas fa-cart-plus"></i> Adicionar ao Carrinho
                </button>
            </div>
        `;
    } else {
        // Bloco de detalhes (com botão para abrir a compra)
        html += `
            <div class="d-grid gap-2">
                <button class="btn btn-primary btn-lg add-to-cart-btn" data-id="${fullProduct.id}" aria-label="Comprar ${fullProduct.nome}">
                    <i class="fas fa-shopping-cart"></i> Comprar Agora
                </button>
            </div>
        `;
    }
    
    html += `
            </div>
        </div>
    `;

    $body.html(html);
    
    // Altera o título do modal
    $('#productDetailModalLabel').text(showQuantityControl ? `Comprar: ${fullProduct.nome}` : 'Detalhes do Produto');
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
// III. Tratamento de Eventos (Event Listeners e Handlers)
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

    // 3. Handler para ver detalhes do produto (Abre Modal de Detalhes)
    $('#productCatalog, #productDetailBody').on('click', '.view-details-btn', function () {
        const productId = $(this).data('id').toString(); // Garante string
        const product = CATALOG_DATA.find(p => p.id === productId);

        if (product) {
            // Renderiza SÓ os detalhes (showQuantityControl = false)
            renderProductDetails(product, false); 
            const detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            detailModal.show();
        } else {
            showToast('Produto não encontrado no catálogo.', 'bg-danger');
        }
    });

    // 4.1: Handler para ABRIR o Modal de Confirmação de Compra 
    $('#productCatalog, #productDetailBody').on('click', '.add-to-cart-btn', function (event) {
        event.preventDefault(); 
        
        // CORREÇÃO: Garante que o ID lido é uma string para match com o CATALOG_DATA
        const productId = $(this).data('id').toString(); 
        const product = CATALOG_DATA.find(p => p.id === productId);
        
        if (product) {
            // Renderiza o Modal com o controle de QUANTIDADE (showQuantityControl = true)
            renderProductDetails(product, true); 
            const detailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
            detailModal.show();
        } else {
            showToast('Erro: Produto não encontrado para compra.', 'bg-danger');
        }
    });

    // 4.2: Handler para CONFIRMAR a adição no Modal de Confirmação (POST/PUT)
    $('#productDetailBody').on('click', '.confirm-add-to-cart-btn', async function () {
        const $btn = $(this);
        const productId = $btn.data('id');
        const productName = $btn.data('nome');
        const productPrice = $btn.data('preco');
        const $quantityInput = $('#quantityInput');
        const $errorSpan = $('#quantityError');
        
        const quantity = parseInt($quantityInput.val(), 10);
        
        if (isNaN(quantity) || quantity < 1 || !Number.isInteger(quantity)) {
            $errorSpan.text('Por favor, insira uma quantidade inteira válida (mínimo 1).').show();
            $quantityInput.addClass('is-invalid');
            return;
        }
        
        $errorSpan.hide();
        $quantityInput.removeClass('is-invalid');

        const cartItemData = {
            produtoId: productId,
            nomeProduto: productName,
            precoUnitario: productPrice,
        };
        
        try {
            await postCartItemWithQuantity(cartItemData, quantity);
            const detailModal = bootstrap.Modal.getInstance(document.getElementById('productDetailModal'));
            detailModal.hide();
        } catch (error) {
            console.error("Erro ao adicionar/atualizar carrinho:", error);
            showToast('Falha ao processar sua compra. Tente novamente.', 'bg-danger');
        }
    });
    
    // 5. Handler para Atualizar Quantidade (PUT /carrinho/:id) - Botões +/-
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
                renderCart(); // Reverte a UI em caso de falha
            });
    });

    // 6. Handler para entrada manual de quantidade (PUT /carrinho/:id)
    $('#cartItemsContainer').on('change', '.quantity-input', async function () {
        const $input = $(this);
        const cartItemId = $input.data('id');
        const itemName = $input.data('nome');
        const newQuantity = $input.val();

        // Chamada PUT (Atualização)
        putCartItem(cartItemId, newQuantity, itemName)
            .catch(() => {
                renderCart();
            });
    });

    // 7. Handler para Remover Item (DELETE /carrinho/:id)
    $('#cartItemsContainer').on('click', '.delete-cart-item', async function () {
        const cartItemId = $(this).data('id');
        const itemName = $(this).data('name');

        if (window.confirm(`Tem certeza que deseja remover "${itemName}" do carrinho?`)) {
            await deleteCartItem(cartItemId, itemName);
        }
    });

    $('#categoryFilters').on('click', '.filter-btn', function () {
        const selectedCategory = $(this).data('category');

        let filteredList = [];

        if (selectedCategory === 'all') {
            filteredList = CATALOG_DATA;
        } else {
            filteredList = CATALOG_DATA.filter(product => 
                product.categoria && product.categoria.toLowerCase() === selectedCategory.toLowerCase()
            );
        }

        renderProducts(filteredList);
        
        $('#categoryFilters button.filter-btn').removeClass('btn-dark btn-outline-dark').addClass('btn-outline-dark');
        $(this).removeClass('btn-outline-dark').addClass('btn-dark');

        $('html, body').animate({
            scrollTop: $('#productCatalog').offset().top - 100 
        }, 300);
    });
});