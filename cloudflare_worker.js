// Cloudflare Worker для обхода CORS ограничений HDRezka
// Развертывание: wrangler publish --name hdrezka-proxy

export default {
    async fetch(request) {
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Max-Age": "86400",
        };

        async function handleRequest(request) {
            const url = new URL(request.url);
            let api_pos = url.origin.length + 1;
            let api = url.href.substring(api_pos);
            let proxy_url = url.href;
            let proxy = "";
            let proxy_enc = "";
            let enc = "";
            let ip = "";
            let redirect = request.method === "POST" ? "manual" : "follow";
            let get_cookie = false;
            let cookie_plus = false;
            let get_redirect = false;
            let force_head = false;
            let remove_compression = false;
            let params = [];
            let cdn_info = "cdn_HDRezka_CF";
            let user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

            if (api === "headers") {
                let body = "";
                body += "request_method = " + request.method + "\\n";
                for (let [key, value] of request.headers) {
                    body += key + " = " + value + "\\n";
                }
                body += "request_url = " + request.url + "\\n";
                body += "cf_worker_version = 1.0\\n";
                return new Response(body, { headers: corsHeaders });
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
                return new Response("HDRezka Cloudflare Proxy v1.0\\nСтатус: Работает", { headers: corsHeaders });
            }

            // Создание URL
            let apiUrl = new URL(api);
            
            // Создание запроса
            let init = {
                method: request.method,
                headers: new Headers(request.headers),
                body: request.body,
                redirect: redirect
            };

            if (force_head) {
                init.method = "HEAD";
            }

            // Настройка заголовков для HDRezka
            init.headers.set("Origin", apiUrl.origin);
            init.headers.set("Referer", apiUrl.origin + "/");
            
            // Удаление браузерных заголовков
            init.headers.delete("cf-connecting-ip");
            init.headers.delete("cf-ipcountry");
            init.headers.delete("cf-ray");
            init.headers.delete("cf-visitor");

            // Специальные настройки для HDRezka
            if (apiUrl.hostname === "rezka.ag" || 
                apiUrl.hostname === "hdrezka.ag" || 
                apiUrl.hostname === "hdrezka.me" || 
                apiUrl.hostname === "hdrezka.sh" || 
                apiUrl.hostname === "hdrezka.cm" || 
                apiUrl.hostname === "hdrezka.kim" || 
                apiUrl.hostname === "hdrezka.la" || 
                apiUrl.hostname === "rezka.pub") {
                init.headers.set("User-Agent", user_agent);
            }

            // Обработка сжатия
            if (remove_compression) {
                let encoding = (init.headers.get("Accept-Encoding") || "");
                if (encoding.includes("zstd") || encoding.includes("deflate")) {
                    encoding = encoding.split(",").filter(enc=>!(enc.includes("zstd") || enc.includes("deflate"))).join(",") || "identity";
                    init.headers.set("Accept-Encoding", encoding);
                }
            }

            // Применение параметров
            params.forEach(param => {
                if (param[0]) {
                    if (param[1]) {
                        init.headers.set(decodeURIComponent(param[0]), decodeURIComponent(param[1] || ""));
                    } else {
                        init.headers.delete(decodeURIComponent(param[0]));
                    }
                }
            });

            // Выполнение запроса
            let response = await fetch(api, init);
            
            // Создание ответа с CORS заголовками
            let modifiedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    ...corsHeaders,
                    ...Object.fromEntries(response.headers),
                }
            });

            // Обработка специальных режимов
            if (get_cookie || cookie_plus || get_redirect) {
                let json = {
                    url: response.url,
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
                    for (let [key, value] of response.headers) {
                        headers[key] = value;
                    }
                    json.headers = headers;
                    
                    let ctype = response.headers.get("Content-Type") || "";
                    if (ctype.startsWith("text/") || 
                        ["application/json", "application/xml"].indexOf(ctype) !== -1) {
                        json.body = await response.text();
                    }
                }
                
                return new Response(JSON.stringify(json), {
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json; charset=utf-8",
                    },
                });
            }

            return modifiedResponse;
        }

        // Обработка OPTIONS (CORS preflight)
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    ...corsHeaders,
                    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "",
                },
            });
        }

        try {
            return await handleRequest(request);
        } catch (error) {
            return new Response("Proxy Error: " + error.message, {
                status: 500,
                headers: corsHeaders
            });
        }
    },
};
