#include "crow_all.h"
#include <vector>
#include <map>
#include <stack>
#include <algorithm>
#include <set>
#include <string>

using namespace std;

bool isConnected(const map<int, vector<int>> &adj, const set<int> &nodes)
{
    if (nodes.empty())
        return true;
    set<int> visited;
    stack<int> s;
    s.push(*nodes.begin());
    visited.insert(*nodes.begin());
    while (!s.empty())
    {
        int u = s.top();
        s.pop();
        if (adj.count(u))
        {
            for (int v : adj.at(u))
            {
                if (visited.find(v) == visited.end())
                {
                    visited.insert(v);
                    s.push(v);
                }
            }
        }
    }
    return visited.size() == nodes.size();
}

// Thuật toán tìm chu trình/đường đi Euler cho đồ thị CÓ HƯỚNG
vector<int> findEulerDirected(map<int, vector<int>> graph, int start)
{
    for (auto &pair : graph) {
        sort(pair.second.begin(), pair.second.end());
    }

    vector<int> stack;
    vector<int> CE; 
    stack.push_back(start); 

    while (!stack.empty())
    {
        int s = stack.back(); 

        if (!graph[s].empty()) 
        {
            int t = graph[s].front(); 
            stack.push_back(t);       
            graph[s].erase(graph[s].begin());  
        }
        else 
        {
            stack.pop_back(); 
            CE.push_back(s);  
        }
    }

    reverse(CE.begin(), CE.end()); 
    return CE;
}

// Thuật toán tìm chu trình/đường đi Euler cho đồ thị VÔ HƯỚNG
vector<int> findEulerUndirected(const vector<pair<int, int>> &edges, int start)
{
    map<int, vector<pair<int, int>>> graph;
    int m = static_cast<int>(edges.size());
    vector<bool> used(m, false);
    for (int i = 0; i < m; i++)
    {
        int u = edges[i].first;
        int v = edges[i].second;
        graph[u].push_back({v, i});
        graph[v].push_back({u, i});
    }

    for (auto &pair : graph) {
        sort(pair.second.begin(), pair.second.end());
    }

    vector<int> stack;
    vector<int> CE; 
    stack.push_back(start); 

    while (!stack.empty())
    {
        int s = stack.back(); 
        
        bool has_edge = false;
        int t = -1;
        int edge_id = -1;
        int index_to_remove = -1;

        for (size_t i = 0; i < graph[s].size(); i++)
        {
            if (!used[graph[s][i].second])  
            {
                t = graph[s][i].first; 
                edge_id = graph[s][i].second;
                index_to_remove = i;
                has_edge = true;
                break;
            }
        }

        if (has_edge) 
        {
            stack.push_back(t); 
            used[edge_id] = true; 
            graph[s].erase(graph[s].begin() + index_to_remove); 
        }
        else 
        {
            stack.pop_back(); 
            CE.push_back(s);  
        }
    }

    reverse(CE.begin(), CE.end()); 
    return CE;
}

int main()
{
    crow::Crow<crow::CORSHandler> app;

    auto &cors = app.get_middleware<crow::CORSHandler>();
    cors.global()
        .headers("Content-Type")
        .methods("POST"_method, "GET"_method, "OPTIONS"_method)
        .origin("*");

    CROW_ROUTE(app, "/solve").methods("POST"_method, "OPTIONS"_method)([](const crow::request &req) -> crow::response
                                                                       {
        auto res = crow::response(200);
        res.add_header("Access-Control-Allow-Origin", "*");
        res.add_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
        res.add_header("Access-Control-Allow-Headers", "Content-Type");
        res.add_header("Access-Control-Max-Age", "86400");
        
        if (req.method == "OPTIONS"_method) {
            cout << "✅ OPTIONS preflight request received" << endl;
            return res;
        }

        cout << "✅ POST request received" << endl;
        try {
            auto data = crow::json::load(req.body);
            crow::json::wvalue res_body;
            auto response = crow::response();
            response.add_header("Access-Control-Allow-Origin", "*");
            response.add_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            response.add_header("Access-Control-Allow-Headers", "Content-Type");

            bool directed = false;
            if (data.has("graphType") && data["graphType"].s() == "directed")
            {
                directed = true;
            }

            int reqStartNode = -1;
            if (data.has("startNode")) {
                reqStartNode = data["startNode"].i();
            }

            map<int, vector<int>> directedGraph;
            map<int, vector<int>> undirectedAdj;
            map<int, int> inDegree;
            map<int, int> outDegree;
            map<int, int> degree;
            set<int> nodes;
            vector<pair<int, int>> edges;

            if (data.has("edges"))
            {
                for (auto &e : data["edges"])
                {
                    int u = e[0].i();
                    int v = e[1].i();
                    edges.emplace_back(u, v);
                    nodes.insert(u);
                    nodes.insert(v);

                    if (directed)
                    {
                        outDegree[u]++;
                        inDegree[v]++;
                        directedGraph[u].push_back(v);
                        if (!directedGraph.count(v))
                            directedGraph[v] = {};
                    }
                    else
                    {
                        degree[u]++;
                        degree[v]++;
                    }

                    undirectedAdj[u].push_back(v);
                    undirectedAdj[v].push_back(u);
                }
            }

            bool hasEdges = !edges.empty();
            bool weaklyConnected = hasEdges ? isConnected(undirectedAdj, nodes) : true;
            bool success = false;
            string type = "NotEuler";
            int startNode = -1;
            vector<int> route;

            if (!weaklyConnected)
            {
                res_body["status"] = "Fail";
                res_body["type"] = "NotConnected";
            }
            else if (!hasEdges)
            {
                res_body["status"] = "Fail";
                res_body["type"] = "NoEdges";
            }
            else
            {
                if (directed)
                {
                    int startCount = 0, endCount = 0, balancedCount = 0, anyStart = -1;
                    for (int node : nodes)
                    {
                        int inDeg = inDegree[node];
                        int outDeg = outDegree[node];
                        if (outDeg == inDeg + 1)
                        {
                            startCount++;
                            if (startNode == -1) startNode = node; 
                        }
                        else if (inDeg == outDeg + 1) endCount++;
                        else if (inDeg == outDeg) balancedCount++;
                        
                        if (outDeg > 0 && anyStart == -1) anyStart = node;
                    }

                    if (startCount == 1 && endCount == 1 && balancedCount == static_cast<int>(nodes.size()) - 2)
                    {
                        success = true;
                        type = "EulerPath"; 
                    }
                    else if (startCount == 0 && endCount == 0 && balancedCount == static_cast<int>(nodes.size()))
                    {
                        success = true;
                        type = "EulerCycle";
                        // Tôn trọng đỉnh xuất phát nếu hợp lệ
                        startNode = (reqStartNode != -1 && (outDegree.count(reqStartNode) > 0 || inDegree.count(reqStartNode) > 0)) ? reqStartNode : anyStart;
                    }

                    if (success) route = findEulerDirected(directedGraph, startNode);
                }
                else
                {
                    int oddCount = 0;
                    vector<int> oddList;
                    int anyStart = -1;

                    for (int node : nodes)
                    {
                        if (degree[node] % 2 != 0)
                        {
                            oddCount++;
                            oddList.push_back(node);
                        }
                        if (degree[node] > 0 && anyStart == -1) anyStart = node;
                    }

                    if (oddCount == 0)
                    {
                        success = true;
                        type = "EulerCycle";
                        // Tôn trọng đỉnh xuất phát user chọn
                        startNode = (reqStartNode != -1 && degree.count(reqStartNode) > 0) ? reqStartNode : anyStart;
                    }
                    else if (oddCount == 2)
                    {
                        success = true;
                        type = "EulerPath";
                        startNode = oddList[0]; 
                        // Cho phép chọn 1 trong 2 đỉnh bậc lẻ
                        if (reqStartNode != -1 && (reqStartNode == oddList[0] || reqStartNode == oddList[1])) {
                            startNode = reqStartNode;
                        }
                    }

                    if (success) route = findEulerUndirected(edges, startNode);
                }
            }

            for (int node : nodes)
            {
                auto key = to_string(node);
                if (directed)
                {
                    res_body["details"][key]["in"] = inDegree[node];
                    res_body["details"][key]["out"] = outDegree[node];
                }
                else
                {
                    res_body["details"][key]["deg"] = degree[node];
                }
            }

            res_body["graphType"] = directed ? "directed" : "undirected";
            res_body["edges_count"] = static_cast<int>(edges.size());

            if (success && !route.empty())
            {
                res_body["status"] = "Success";
                res_body["type"] = type;
                res_body["start_node"] = startNode;
                std::vector<int> routeValues(route.begin(), route.end());
                res_body["route"] = routeValues;
            }
            else
            {
                res_body["status"] = "Fail";
                if (!weaklyConnected)
                    res_body["type"] = "Đồ thị không liên thông";
                else
                    res_body["type"] = "Không phải Euler";
            }

            response.body = res_body.dump();
            return response;
        } catch (const std::exception &e) {
            crow::json::wvalue errorRes;
            errorRes["status"] = "Error";
            errorRes["message"] = e.what();
            auto response = crow::response(400);
            response.add_header("Access-Control-Allow-Origin", "*");
            response.add_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            response.add_header("Access-Control-Allow-Headers", "Content-Type");
            response.body = errorRes.dump();
            return response;
        } });

    cout << "PTIT SERVER DANG CHAY TAI PORT 18080..." << endl;
    app.port(18080).run();
}