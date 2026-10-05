const display = document.getElementById("display");

// =========================
// 后端 API 公网地址
// =========================
// 如果以后重新创建 Cloudflare Tunnel，
// 只需要修改这一行即可。
const API_BASE_URL =
    "https://along-charity-rome-recommend.trycloudflare.com";


let expression = "";
let justEvaluated = false;


// =========================
// 更新显示屏
// =========================
function updateDisplay(value) {
    display.value = value || "0";
}


// =========================
// 判断是否是四则运算符
// =========================
function isOperator(char) {
    return ["+", "-", "*", "/"].includes(char);
}


// =========================
// 清空计算器
// =========================
function clearCalculator() {
    expression = "";
    justEvaluated = false;
    updateDisplay("0");
}


// =========================
// 删除最后一个字符
// =========================
function deleteLast() {

    if (justEvaluated) {
        expression = "";
        justEvaluated = false;
        updateDisplay("0");
        return;
    }

    expression = expression.slice(0, -1);

    updateDisplay(expression || "0");
}


// =========================
// 调用 Java 后端计算
// =========================
async function calculateResult() {

    if (!expression) {
        return;
    }

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/calculate`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    expression: expression
                })
            }
        );


        const data = await response.json();


        // 后端返回错误
        if (!response.ok) {

            throw new Error(
                data.error || "计算失败"
            );
        }


        // 显示计算结果
        expression = String(data.result);

        justEvaluated = true;

        updateDisplay(expression);


        // 计算成功后重新加载历史记录
        await loadHistory();


    } catch (error) {

        console.error(
            "计算请求失败：",
            error
        );


        // 如果是网络连接问题
        if (
            error instanceof TypeError &&
            error.message.includes("fetch")
        ) {

            display.value = "服务器连接失败";

        } else {

            display.value =
                error.message || "计算失败";
        }
    }
}


// =========================
// 监听所有计算器按钮
// =========================
document
    .querySelectorAll(".key")
    .forEach((button) => {

        button.addEventListener(
            "click",
            async () => {

                const value =
                    button.dataset.value;

                const action =
                    button.dataset.action;


                // =========================
                // C 清空
                // =========================
                if (action === "clear") {

                    clearCalculator();

                    return;
                }


                // =========================
                // 删除
                // =========================
                if (action === "delete") {

                    deleteLast();

                    return;
                }


                // =========================
                // 等号
                // =========================
                if (action === "equals") {

                    await calculateResult();

                    return;
                }


                // 没有 data-value
                if (!value) {
                    return;
                }


                // =========================
                // 左括号
                // =========================
                if (value === "(") {

                    // 如果上一次已经计算完成，
                    // 输入左括号时开始新的表达式
                    if (justEvaluated) {

                        expression = "";

                        justEvaluated = false;
                    }


                    expression += "(";

                    updateDisplay(expression);

                    return;
                }


                // =========================
                // 右括号
                // =========================
                if (value === ")") {

                    if (!expression) {
                        return;
                    }


                    // 运算符后面不能直接输入右括号
                    if (
                        isOperator(
                            expression.slice(-1)
                        )
                    ) {
                        return;
                    }


                    expression += ")";

                    justEvaluated = false;

                    updateDisplay(expression);

                    return;
                }


                // =========================
                // 小数点
                // =========================
                if (value === ".") {

                    // 计算完成后输入小数点，
                    // 开始一个新的数字
                    if (justEvaluated) {

                        expression = "";

                        justEvaluated = false;
                    }


                    const lastNumber =
                        expression
                            .split(/[+\-*/()]/)
                            .at(-1);


                    // 防止一个数字出现多个小数点
                    if (
                        lastNumber &&
                        lastNumber.includes(".")
                    ) {
                        return;
                    }


                    // 如果在开头、
                    // 运算符后面、
                    // 左括号后面输入 .
                    // 自动转成 0.
                    if (
                        !expression ||
                        isOperator(
                            expression.slice(-1)
                        ) ||
                        expression.endsWith("(")
                    ) {

                        expression += "0.";

                    } else {

                        expression += ".";
                    }


                    updateDisplay(expression);

                    return;
                }


                // =========================
                // 数字
                // =========================
                if (/\d/.test(value)) {

                    // 计算完成以后再输入数字，
                    // 开始新的表达式
                    if (justEvaluated) {

                        expression = "";

                        justEvaluated = false;
                    }


                    expression += value;

                    updateDisplay(expression);

                    return;
                }


                // =========================
                // 四则运算符
                // =========================
                if (isOperator(value)) {

                    // 表达式为空
                    if (!expression) {

                        // 允许表达式以负号开始
                        if (value === "-") {

                            expression = "-";

                            updateDisplay(expression);
                        }

                        return;
                    }


                    // =========================
                    // 支持负数
                    // 例如：
                    // 3*-2
                    // 3/-2
                    // =========================
                    if (
                        value === "-" &&
                        (
                            isOperator(
                                expression.slice(-1)
                            ) ||
                            expression.endsWith("(")
                        )
                    ) {

                        expression += "-";

                        justEvaluated = false;

                        updateDisplay(expression);

                        return;
                    }


                    // 防止连续输入普通运算符
                    // 例如 12++3
                    if (
                        isOperator(
                            expression.slice(-1)
                        )
                    ) {
                        return;
                    }


                    expression += value;

                    justEvaluated = false;

                    updateDisplay(expression);

                    return;
                }
            }
        );
    });


// =========================
// 加载计算历史
// =========================
async function loadHistory() {

    const historyList =
        document.getElementById(
            "history-list"
        );


    if (!historyList) {
        return;
    }


    historyList.innerHTML =
        '<p class="history-empty">Loading...</p>';


    try {

        const response = await fetch(
            `${API_BASE_URL}/api/history`
        );


        if (!response.ok) {

            throw new Error(
                "无法获取计算历史"
            );
        }


        const history =
            await response.json();


        // =========================
        // 没有历史记录
        // =========================
        if (history.length === 0) {

            historyList.innerHTML =
                '<p class="history-empty">暂无计算记录</p>';

            return;
        }


        historyList.innerHTML = "";


        // =========================
        // 生成历史记录
        // =========================
        history.forEach((item) => {

            const historyItem =
                document.createElement(
                    "div"
                );

            historyItem.className =
                "history-item";


            // -------------------------
            // 历史内容
            // -------------------------
            const content =
                document.createElement(
                    "div"
                );

            content.className =
                "history-content";


            // 表达式
            const expressionElement =
                document.createElement(
                    "div"
                );

            expressionElement.className =
                "history-expression";

            expressionElement.textContent =
                item.expression;


            // 结果
            const result =
                document.createElement(
                    "div"
                );

            result.className =
                "history-result";

            result.textContent =
                `= ${item.result}`;


            // 时间
            const time =
                document.createElement(
                    "div"
                );

            time.className =
                "history-time";

            time.textContent =
                formatHistoryTime(
                    item.createdAt
                );


            content.appendChild(
                expressionElement
            );

            content.appendChild(
                result
            );

            content.appendChild(
                time
            );


            // =========================
            // 点击历史表达式重新使用
            // =========================
            content.addEventListener(
                "click",
                () => {

                    expression =
                        item.expression;

                    justEvaluated = false;

                    updateDisplay(
                        expression
                    );
                }
            );


            // =========================
            // 删除按钮
            // =========================
            const deleteButton =
                document.createElement(
                    "button"
                );

            deleteButton.className =
                "history-delete";

            deleteButton.type =
                "button";

            deleteButton.textContent =
                "删除";


            deleteButton.addEventListener(
                "click",
                async (event) => {

                    // 防止点击删除时触发历史回填
                    event.stopPropagation();

                    await deleteHistory(
                        item.id
                    );
                }
            );


            historyItem.appendChild(
                content
            );

            historyItem.appendChild(
                deleteButton
            );

            historyList.appendChild(
                historyItem
            );
        });


    } catch (error) {

        console.error(
            "加载历史失败：",
            error
        );


        historyList.innerHTML =
            '<p class="history-empty">历史记录加载失败</p>';
    }
}


// =========================
// 删除指定历史记录
// =========================
async function deleteHistory(id) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/api/history/${id}`,
            {
                method: "DELETE"
            }
        );


        if (!response.ok) {

            throw new Error(
                "删除失败"
            );
        }


        // 删除成功后重新读取数据库
        await loadHistory();


    } catch (error) {

        console.error(
            "删除历史失败：",
            error
        );


        alert(
            "删除历史记录失败"
        );
    }
}


// =========================
// 格式化历史时间
// =========================
function formatHistoryTime(
    dateString
) {

    if (!dateString) {
        return "";
    }


    const date =
        new Date(dateString);


    return date.toLocaleString(
        "zh-CN",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// =========================
// 刷新历史按钮
// =========================
const refreshHistoryButton =
    document.getElementById(
        "refresh-history"
    );


if (refreshHistoryButton) {

    refreshHistoryButton
        .addEventListener(
            "click",
            loadHistory
        );
}


// =========================
// 页面打开时加载历史
// =========================
loadHistory();