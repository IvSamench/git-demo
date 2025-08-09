// Deno Proxy для обхода CORS ограничений HDRezka
// Развертывание: deno deploy --project=hdrezka-proxy deno_proxy.js

async function handle(request, connInfo) {
    const corsHeaders = {
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
    };
    
    const corsOptionsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
    };

    async function handleRequest(request, connInfo) {
        const url = new URL(request.url);
        let api_pos = url.origin.length + 1;
        let api = url.href.substring(api_pos);
        let proxy_url = url.href;
        let proxy = "";
        let proxy_enc = "";
        let enc = "";
        let ip = "no";
        let redirect = request.method === "POST" ? "manual" : "follow";
        let get_cookie = false;
        let cookie_plus = false;
        let get_redirect = false;
        let force_head = false;
        let remove_compression = false;
        let params = [];
        let cdn_info = "cdn_HDRezka";
        let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

        if (api === "headers") {
            let body = "";
            body += "request_method = " + request.method + "\n";
            request.headers.forEach((value, key) => body += key + " = " + value + "\n");
            if (connInfo && connInfo.remoteAddr) {
                body += "connInfo" + " = " + JSON.stringify(connInfo.remoteAddr) + "\n";
            }
            body += "request_url" + " = " + request.url + "\n";
            body += "hdrezka_proxy_version = 1.0\n";
            return new Response(body, corsHeaders);
        }

        if (api.startsWith("?")) {
            api_pos += 1;
            api = api.substring(1);
        }

        // Парсинг параметров прокси
        let next_param = true;
        while (next_param) {
            if (api.startsWith("ip")) {
                let pos = api.indexOf("/");
                if (pos !== -1) {
                    ip = api.substring(2, pos);
                    api_pos += pos + 1;
                    api = api.substring(pos + 1);
                } else {
                    ip = api.substring(2);
                    api_pos += api.length;
                    api = "";
                }
            } else if (api.startsWith("redirect=")) {
                let pos = api.indexOf("/");
                if (pos !== -1) {
                    redirect = api.substring(9, pos);
                    api_pos += pos + 1;
                    api = api.substring(pos + 1);
                } else {
                    redirect = api.substring(9);
                    api_pos += api.length;
                    api = "";
                }
            } else if (api.startsWith("get_cookie/")) {
                get_cookie = true;
                api_pos += 11;
                api = api.substring(11);
            } else if (api.startsWith("cookie_plus/")) {
                cookie_plus = true;
                remove_compression = true;
                api_pos += 12;
                api = api.substring(12);
            } else if (api.startsWith("get_redirect/")) {
                get_redirect = true;
                redirect = "manual";
                api_pos += 13;
                api = api.substring(13);
            } else if (api.startsWith("head/")) {
                force_head = true;
                api_pos += 5;
                api = api.substring(5);
            } else if (api.startsWith("param?") || api.startsWith("param/")) {
                api_pos += 6;
                api = api.substring(6);
                let param;
                let pos = api.indexOf("/");
                if (pos !== -1) {
                    param = api.substring(0, pos);
                    api_pos += pos + 1;
                    api = api.substring(pos + 1);
                } else {
                    param = api.substring(0);
                    api_pos += api.length;
                    api = "";
                }
                pos = param.indexOf("=");
                if (pos !== -1) {
                    params.push([param.substring(0, pos), param.substring(pos + 1)]);
                } else {
                    params.push([param]);
                }
            } else if (api.startsWith("enc/") || api.startsWith("enc1/") || api.startsWith("enc2/")) {
                let cur_enc = api.substring(0, api.indexOf("/"));
                if (enc) {
                    proxy_enc += proxy_url.substring(0, api_pos);
                } else {
                    proxy += proxy_url.substring(0, api_pos);
                    enc = cur_enc;
                }
                api = api.substring(cur_enc.length + 1);
                let pos = api.indexOf("/");
                if (pos !== -1) {
                    api = atob(decodeURIComponent(api.substring(0, pos))) + (cur_enc === "enc2" ? "" : api.substring(pos + 1));
                } else {
                    api = atob(decodeURIComponent(api.substring(0)));
                }
                api_pos = proxy_url.length;
            } else {
                next_param = false;
            }
        }

        if (!api) {
            return new Response("HDRezka Proxy Server v1.0\nУспешный запуск!", corsHeaders);
        }

        // Создание URL для запроса
        let apiUrl = new URL(api);
        let apiBase = apiUrl.href.substring(0, apiUrl.href.lastIndexOf("/") + 1);

        // Проверка User-Agent клиента
        let clientUserAgent = request.headers.get("User-Agent") || '';
        let clientOrigin = request.headers.get("Origin") || '';
        
        // Блокировка нежелательных клиентов
        if ((/\\blampishe\\b|\\bprisma_client\\b/).test(clientUserAgent) ||
            clientOrigin.endsWith("lampishe.cc") ||
            clientOrigin.endsWith("prisma.ws") ||
            clientOrigin.endsWith("bylampa.online")) {
            let error = "Access Denied";
            return new Response(error + ": " + api, {
                ...corsHeaders,
                status: 403,
                statusText: error,
            });
        }

        // Создание запроса
        request = new Request(api, request);
        if (force_head) {
            request = new Request(request, {method: "HEAD"});
        }

        // Добавление CDN-Loop защиты
        let cdn_loop = request.headers.get("CDN-Loop");
        if (cdn_loop && cdn_loop.indexOf(cdn_info) !== -1) {
            let error = "CDN-Loop detected";
            return new Response(error, {
                ...corsHeaders,
                status: 403,
                statusText: error,
            });
        } else {
            request.headers.append("CDN-Loop", cdn_info);
        }

        // Настройка заголовков для HDRezka
        request.headers.set("Origin", apiUrl.origin);
        request.headers.set("Referer", apiUrl.origin + "/");
        
        // Удаление браузерных заголовков
        request.headers.delete("Sec-Fetch-Dest");
        request.headers.delete("Sec-Fetch-Mode");
        request.headers.delete("Sec-Fetch-Site");
        request.headers.delete("Sec-Fetch-User");
        request.headers.delete("Sec-CH-UA");
        request.headers.delete("Sec-CH-UA-Mobile");
        request.headers.delete("Sec-CH-UA-Platform");
        request.headers.delete("Host");
        request.headers.delete("X-Forwarded-For");
        request.headers.delete("X-Forwarded-Proto");
        request.headers.delete("cf-connecting-ip");
        request.headers.delete("cf-ipcountry");
        request.headers.delete("cf-ray");
        request.headers.delete("cf-visitor");

        // Установка IP если указан
        if (ip && ip !== "no") {
            request.headers.set("X-Forwarded-For", ip);
            request.headers.set("X-Forwarded-Proto", "https");
            request.headers.set("X-Real-IP", ip);
            request.headers.set("cf-connecting-ip", ip);
        }

        // Специальные настройки для HDRezka доменов
        if (apiUrl.hostname === "rezka.ag" || 
            apiUrl.hostname === "hdrezka.ag" || 
            apiUrl.hostname === "hdrezka.me" || 
            apiUrl.hostname === "hdrezka.sh" || 
            apiUrl.hostname === "hdrezka.cm" || 
            apiUrl.hostname === "hdrezka.kim" || 
            apiUrl.hostname === "hdrezka.la" || 
            apiUrl.hostname === "rezka.pub") {
            request.headers.set("User-Agent", user_agent);
        }

        // Обработка сжатия
        if (remove_compression) {
            let encoding = (request.headers.get("Accept-Encoding") || "");
            if (encoding.includes("zstd") || encoding.includes("deflate")) {
                encoding = encoding.split(",").filter(enc=>!(enc.includes("zstd") || enc.includes("deflate"))).join(",") || "identity";
                request.headers.set("Accept-Encoding", encoding);
            }
        }

        // Применение пользовательских параметров
        params.forEach(param => {
            if (param[0]) {
                if (param[1]) {
                    request.headers.set(decodeURIComponent(param[0]), decodeURIComponent(param[1] || ""));
                } else {
                    request.headers.delete(decodeURIComponent(param[0]));
                }
            }
        });

        // Выполнение запроса
        let response = await fetch(request, {
            redirect: redirect,
        });
        
        let currentUrl = response.url;

        // Создание модифицированного ответа
        response = new Response(response.body, response);
        
        // Добавление CORS заголовков
        response.headers.set("Access-Control-Allow-Origin", "*");
        response.headers.set("Vary", "Origin");

        // Обработка специальных режимов
        if (get_cookie || cookie_plus || get_redirect) {
            let json = {
                url: currentUrl,
                status: response.status,
                statusText: response.statusText
            };
            
            if (get_cookie || cookie_plus) {
                let cookies = [];
                response.headers.forEach((value, key) => {
                    if (key.toLowerCase() === "set-cookie") {
                        cookies.push(value);
                    }
                });
                json.cookie = cookies.join("; ");
            }
            
            if (get_redirect) {
                json.location = response.headers.get("Location") || "";
            }
            
            if (cookie_plus) {
                let headers = {};
                for (let key of response.headers.keys()) {
                    if (key === "set-cookie") {
                        headers[key] = json.cookie;
                    } else {
                        headers[key] = response.headers.get(key);
                    }
                }
                json.headers = headers;
                
                let ctype = response.headers.get("Content-Type") || "";
                if (ctype.startsWith("text/") || 
                    ["application/json", "application/xml", "application/x-mpegurl", 
                     "application/vnd.apple.mpegurl", "application/dash+xml"].indexOf(ctype) !== -1) {
                    json.body = await response.text();
                }
            }
            
            return new Response(JSON.stringify(json), {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Vary": "Origin",
                    "Content-Type": "application/json; charset=utf-8",
                },
            });
        }

        // Обработка редиректов
        if (response.status >= 300 && response.status < 400) {
            let location = response.headers.get("Location");
            if (location) {
                if (!location.startsWith("http")) {
                    if (location.startsWith("//")) {
                        location = apiUrl.protocol + location;
                    } else if (location.startsWith("/")) {
                        location = apiUrl.origin + location;
                    } else {
                        location = apiBase + location;
                    }
                }
                
                if (proxy) {
                    location = proxy + (enc ? enc + "/" + btoa(encodeURIComponent(location)) : location);
                }
                
                response.headers.set("Location", location);
            }
        }

        return response;
    }

    async function handleOptions(request, connInfo) {
        if (request.headers.get("Origin") !== null &&
            request.headers.get("Access-Control-Request-Method") !== null &&
            request.headers.get("Access-Control-Request-Headers") !== null) {
            // CORS preflight запрос
            return new Response(null, {
                headers: {
                    ...corsOptionsHeaders,
                    "Access-Control-Allow-Headers": request.headers.get(
                        "Access-Control-Request-Headers"
                    ),
                },
            });
        } else {
            // Стандартный OPTIONS запрос
            return new Response(null, {
                headers: {
                    Allow: "GET, HEAD, POST, OPTIONS",
                },
            });
        }
    }

    if (request.method === "OPTIONS") {
        return handleOptions(request, connInfo);
    } else {
        return handleRequest(request, connInfo);
    }
}

// Запуск сервера
const port = parseInt(Deno.env.get("PORT") || "8000");
Deno.serve({port: port}, handle);
