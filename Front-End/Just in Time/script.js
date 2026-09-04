const API = "http://localhost:3000";

const page = document.body.dataset.page;

const $ = (selector, root = document) => root.querySelector(selector);

const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function getUser() {
    try {
        return JSON.parse(localStorage.getItem("secondStoryUser")) || null;
    } catch {
        return null;
    }
}

function setMessage(el, text = "", error = true) {
    if (!el) return;

    el.textContent = text;
    el.style.color = error ? "var(--danger)" : "var(--sage-dark)";
}

function toast(text) {
    const el = $("#toast");

    if (!el) return;

    el.textContent = text;
    el.classList.add("show");

    clearTimeout(window.__toastTimer);

    window.__toastTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 2600);
}

async function request(path, options = {}) {
    const config = {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };

    let response;

    try {
        response = await fetch(API + path, config);
    } catch {
        throw new Error(
            "Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 3000."
        );
    }

    let data = null;

    try {
        data = await response.json();
    } catch {}

    if (!response.ok) {
        throw new Error(
            data?.mensagem ||
            data?.message ||
            "Não foi possível concluir a operação."
        );
    }

    return data;
}

function requireLogin() {
    if (page !== "login" && !getUser()) {
        location.href = "index.html";
    }
}

function fillUser() {
    const user = getUser();

    $$("[data-user-name]").forEach(el => {
        el.textContent = user?.nome || "Usuária";
    });
}

function logout() {
    localStorage.removeItem("secondStoryUser");
    location.href = "index.html";
}

$$("[data-logout]").forEach(button => {
    button.addEventListener("click", logout);
});

$$(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
        const input = $("#" + button.dataset.target);

        if (!input) return;

        input.type = input.type === "password" ? "text" : "password";

        button.textContent =
            input.type === "password" ? "♡" : "◉";
    });
});

requireLogin();
fillUser();

if (page === "login") {
    $("#loginForm")?.addEventListener("submit", async event => {
        event.preventDefault();

        const message = $("#loginMessage");

        setMessage(message, "Entrando...", false);

        try {
            const data = await request("/login", {
                method: "POST",
                body: JSON.stringify({
                    email: $("#loginEmail").value.trim(),
                    senha: $("#loginPassword").value
                })
            });

            localStorage.setItem(
                "secondStoryUser",
                JSON.stringify(data.usuario)
            );

            setMessage(
                message,
                "Login realizado com sucesso.",
                false
            );

            location.href = "produtos.html";
        } catch (error) {
            setMessage(message, error.message, true);
        }
    });

    $("#forgotPassword")?.addEventListener("click", () => {
        toast(
            "A recuperação de senha ainda não está implementada no backend."
        );
    });
}

let products = [];

if (page === "produtos") {
    const modal = $("#productModal");
    const form = $("#productForm");

    async function loadProducts() {
        try {
            products = await request("/produto/listar");

            if (!Array.isArray(products)) {
                products = [];
            }

            renderProducts();
        } catch (error) {
            toast(error.message);
        }
    }

    function renderProducts() {
        const query = ($("#productSearch")?.value || "")
            .toLowerCase()
            .trim();

        const list = products.filter(product =>
            `${product.nome} ${product.descricao}`
                .toLowerCase()
                .includes(query)
        );

        const body = $("#productsTable");

        body.innerHTML = "";

        $("#productsEmpty")?.classList.toggle(
            "hidden",
            list.length > 0
        );

        list.forEach(product => {
            const low = Number(product.estoque) <= 0;

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${product.id}</td>

                <td>
                    <strong>${esc(product.nome)}</strong>
                </td>

                <td>${esc(product.descricao)}</td>

                <td>${Number(product.estoque) || 0}</td>

                <td>
                    <span class="status ${low ? "low" : ""}">
                        ${low ? "Estoque baixo" : "Disponível"}
                    </span>
                </td>

                <td>
                    <div class="actions">
                        <button
                            class="icon-btn"
                            title="Editar"
                            data-edit="${product.id}"
                        >
                            ✎
                        </button>

                        <button
                            class="icon-btn delete"
                            title="Excluir"
                            data-delete="${product.id}"
                        >
                            ♡
                        </button>
                    </div>
                </td>
            `;

            body.appendChild(row);
        });

        $$("[data-edit]").forEach(button => {
            button.addEventListener("click", () => {
                openProduct(
                    products.find(
                        product => product.id == button.dataset.edit
                    )
                );
            });
        });

        $$("[data-delete]").forEach(button => {
            button.addEventListener("click", () => {
                deleteProduct(
                    Number(button.dataset.delete)
                );
            });
        });
    }

    function openProduct(product = null) {
        form.reset();

        $("#productId").value = product?.id || "";
        $("#productName").value = product?.nome || "";
        $("#productDescription").value =
            product?.descricao || "";
        $("#productStock").value =
            product?.estoque ?? 0;

        $("#productModalTitle").textContent =
            product ? "Editar produto" : "Cadastrar produto";

        $("#productModalEyebrow").textContent =
            product ? "EDITAR ITEM" : "NOVO ITEM";

        $("#productMessage").textContent = "";

        modal.classList.remove("hidden");
    }

    async function deleteProduct(id) {
        const product = products.find(
            item => item.id === id
        );

        if (
            !product ||
            !confirm(`Excluir "${product.nome}"?`)
        ) {
            return;
        }

        try {
            await request(
                `/produto/excluir/${id}`,
                {
                    method: "DELETE"
                }
            );

            toast("Produto excluído.");

            loadProducts();
        } catch (error) {
            toast(error.message);
        }
    }

    $("#newProductBtn")?.addEventListener(
        "click",
        () => openProduct()
    );

    $$("[data-close-modal]").forEach(button => {
        button.addEventListener("click", () => {
            modal.classList.add("hidden");
        });
    });

    modal?.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.add("hidden");
        }
    });

    $("#productSearch")?.addEventListener(
        "input",
        renderProducts
    );

    form?.addEventListener("submit", async event => {
        event.preventDefault();

        const id = $("#productId").value;

        const data = {
            nome: $("#productName").value.trim(),
            descricao: $("#productDescription").value.trim(),
            estoque: Number($("#productStock").value)
        };

        try {
            await request(
                id
                    ? `/produto/atualizar/${id}`
                    : "/produto/cadastrar",
                {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify(data)
                }
            );

            modal.classList.add("hidden");

            toast(
                id
                    ? "Produto atualizado ♡"
                    : "Produto cadastrado ♡"
            );

            loadProducts();
        } catch (error) {
            setMessage(
                $("#productMessage"),
                error.message
            );
        }
    });

    loadProducts();
}

let prodProducts = [];
let movements = [];

if (page === "producao") {
    const currentUser = getUser();
    const dateInput = $("#productionDate");

    const now = new Date();

    now.setMinutes(
        now.getMinutes() -
        now.getTimezoneOffset()
    );

    dateInput.value = now
        .toISOString()
        .slice(0, 16);

    async function loadProduction() {
        try {
            const [productList, movementList] =
                await Promise.all([
                    request("/produto/listar"),
                    request("/producao/listar")
                ]);

            prodProducts = Array.isArray(productList)
                ? productList
                : [];

            movements = Array.isArray(movementList)
                ? movementList
                : [];

            prodProducts.sort((a, b) =>
                a.nome.localeCompare(
                    b.nome,
                    "pt-BR"
                )
            );

            const select = $("#productionProduct");

            select.innerHTML =
                '<option value="">Selecione um produto</option>' +
                prodProducts
                    .map(product => `
                        <option value="${product.id}">
                            ${esc(product.nome)}
                        </option>
                    `)
                    .join("");

            $("#productionProductCount").textContent =
                prodProducts.length;

            $("#productionCount").textContent =
                movements.length;

            renderMovements();
        } catch (error) {
            toast(error.message);
        }
    }

    function updateStockPreview() {
        const product = prodProducts.find(
            item =>
                item.id ==
                $("#productionProduct").value
        );

        $("#productionStockPreview").textContent =
            product
                ? Number(product.estoque)
                : "—";
    }

    $("#productionProduct")?.addEventListener(
        "change",
        updateStockPreview
    );

    function renderMovements() {
        const body = $("#productionTable");

        body.innerHTML = "";

        $("#productionEmpty")?.classList.toggle(
            "hidden",
            movements.length > 0
        );

        [...movements]
            .sort(
                (a, b) =>
                    new Date(b.data) -
                    new Date(a.data)
            )
            .forEach(movement => {
                const product =
                    prodProducts.find(
                        item =>
                            item.id ===
                            movement.produtoId
                    );

                const row =
                    document.createElement("tr");

                row.innerHTML = `
                    <td>${movement.id}</td>

                    <td>
                        ${esc(
                            product?.nome ||
                            "Produto #" +
                            movement.produtoId
                        )}
                    </td>

                    <td>
                        <span class="status">
                            ${
                                movement.tipo
                                    ? esc(movement.tipo)
                                    : "Movimentação"
                            }
                        </span>
                    </td>

                    <td>
                        ${formatDate(movement.data)}
                    </td>

                    <td>
                        ${
                            movement.usuarioId ===
                            currentUser?.id
                                ? esc(currentUser.nome)
                                : "Usuário #" +
                                  movement.usuarioId
                        }
                    </td>

                    <td>
                        <div class="actions">
                            <button
                                class="icon-btn delete"
                                data-movement-delete="${movement.id}"
                            >
                                ♡
                            </button>
                        </div>
                    </td>
                `;

                body.appendChild(row);
            });

        $$("[data-movement-delete]").forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        deleteMovement(
                            Number(
                                button.dataset
                                    .movementDelete
                            )
                        );
                    }
                );
            }
        );
    }

    async function deleteMovement(id) {
        if (!confirm("Excluir esta movimentação?")) {
            return;
        }

        try {
            await request(
                `/producao/excluir/${id}`,
                {
                    method: "DELETE"
                }
            );

            toast("Movimentação excluída.");

            loadProduction();
        } catch (error) {
            toast(error.message);
        }
    }

    $("#productionForm")?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const data = {
                produtoId: Number(
                    $("#productionProduct").value
                ),
                usuarioId: Number(
                    currentUser.id
                ),
                data: new Date(
                    $("#productionDate").value
                ).toISOString()
            };

            if (!data.produtoId) {
                return setMessage(
                    $("#productionMessage"),
                    "Selecione um produto."
                );
            }

            try {
                await request(
                    "/producao/cadastrar",
                    {
                        method: "POST",
                        body: JSON.stringify(data)
                    }
                );

                setMessage(
                    $("#productionMessage"),
                    "Movimentação registrada com sucesso.",
                    false
                );

                toast(
                    "Movimentação registrada ♡"
                );

                loadProduction();
            } catch (error) {
                setMessage(
                    $("#productionMessage"),
                    error.message
                );
            }
        }
    );

    loadProduction();
}

let users = [];

if (page === "usuarios") {
    const form = $("#userForm");

    async function loadUsers() {
        try {
            users = await request(
                "/usuarios/listar"
            );

            users = Array.isArray(users)
                ? users
                : [];

            renderUsers();
        } catch (error) {
            toast(error.message);
        }
    }

    function renderUsers() {
        const query = ($("#userSearch")?.value || "")
            .toLowerCase()
            .trim();

        const list = users.filter(user =>
            `${user.nome} ${user.email}`
                .toLowerCase()
                .includes(query)
        );

        const body = $("#usersTable");

        body.innerHTML = "";

        $("#usersEmpty")?.classList.toggle(
            "hidden",
            list.length > 0
        );

        list.forEach(user => {
            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${user.id}</td>

                <td>
                    <strong>
                        ${esc(user.nome)}
                    </strong>
                </td>

                <td>
                    ${esc(user.email)}
                </td>

                <td>
                    <div class="actions">
                        <button
                            class="icon-btn"
                            data-user-edit="${user.id}"
                        >
                            ✎
                        </button>

                        <button
                            class="icon-btn delete"
                            data-user-delete="${user.id}"
                        >
                            ♡
                        </button>
                    </div>
                </td>
            `;

            body.appendChild(row);
        });

        $$("[data-user-edit]").forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        editUser(
                            users.find(
                                user =>
                                    user.id ==
                                    button.dataset
                                        .userEdit
                            )
                        );
                    }
                );
            }
        );

        $$("[data-user-delete]").forEach(
            button => {
                button.addEventListener(
                    "click",
                    () => {
                        deleteUser(
                            Number(
                                button.dataset
                                    .userDelete
                            )
                        );
                    }
                );
            }
        );
    }

    function editUser(user) {
        if (!user) return;

        $("#userId").value = user.id;
        $("#userName").value = user.nome;
        $("#userEmail").value = user.email;
        $("#userPassword").value =
            user.senha || "";

        $("#userFormTitle").textContent =
            "Editar usuário";

        $("#userSubmit").textContent =
            "Salvar alterações ୨୧";

        $("#cancelUserEdit")
            .classList
            .remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function resetUserForm() {
        form.reset();

        $("#userId").value = "";

        $("#userFormTitle").textContent =
            "Cadastrar usuário";

        $("#userSubmit").textContent =
            "Cadastrar usuário ୨୧";

        $("#cancelUserEdit")
            .classList
            .add("hidden");

        $("#userMessage").textContent = "";
    }

    async function deleteUser(id) {
        const user = users.find(
            item => item.id === id
        );

        if (!user) return;

        if (getUser()?.id === id) {
            return toast(
                "Você não pode excluir o usuário conectado."
            );
        }

        if (
            !confirm(
                `Excluir o usuário "${user.nome}"?`
            )
        ) {
            return;
        }

        try {
            await request(
                `/usuarios/excluir/${id}`,
                {
                    method: "DELETE"
                }
            );

            toast("Usuário excluído.");

            loadUsers();
        } catch (error) {
            toast(error.message);
        }
    }

    $("#userSearch")?.addEventListener(
        "input",
        renderUsers
    );

    $("#cancelUserEdit")?.addEventListener(
        "click",
        resetUserForm
    );

    form?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            const id = $("#userId").value;

            const data = {
                nome: $("#userName").value.trim(),
                email: $("#userEmail").value.trim(),
                senha: $("#userPassword").value
            };

            try {
                await request(
                    id
                        ? `/usuarios/atualizar/${id}`
                        : "/usuarios/cadastrar",
                    {
                        method: id ? "PUT" : "POST",
                        body: JSON.stringify(data)
                    }
                );

                toast(
                    id
                        ? "Usuário atualizado ♡"
                        : "Usuário cadastrado ♡"
                );

                resetUserForm();
                loadUsers();
            } catch (error) {
                setMessage(
                    $("#userMessage"),
                    error.message
                );
            }
        }
    );

    loadUsers();
}

function esc(value = "") {
    return String(value).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}