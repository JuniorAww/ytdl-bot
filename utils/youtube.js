import { $ } from "bun";
console.log('=== YTDL addon ===')

const TABLE_ID = 200;       // номер таблицы маршрутизации
const ASN = "AS15169";      // Google

async function fetchGoogleIPs() {
    try {
        const response = await fetch('https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS15169');
        const { data } = await response.json()
        const prefixes = data.prefixes;
        const ips = prefixes.map(prefix => prefix.prefix);
        console.log(ips.slice(0, 20));
        return ips
    } catch (error) {
        console.error('Ошибка при получении IP-префиксов:', error);
    }
    return []
}

// Поднять VPN
async function startVPN() {
    try {
        await $`sudo wg-quick down wg0`.quiet();
    } catch (e) { console.log(e) }
    
    await $`sudo wg-quick up wg0`.quiet();
    
    console.log("[+] WireGuard запущен");

    // Настроика маршрута по умолчанию
    await $`sudo ip route add default dev wg0 table ${TABLE_ID}`.quiet();
    
    const ips = await fetchGoogleIPs();
    console.log(`[+] Получено ${ips.length} подсетей Google`);
    
    for (const ip of ips) {
        //const cmd = ip.includes('::') ? 'ip -6 rule' : 'ip'
        //await $`sudo ${cmd} rule add to ${ip} lookup ${TABLE_ID}`.quiet();
        if(!ip.includes('::'))
            $`sudo ip rule add to ${ip} lookup ${TABLE_ID}`.quiet();
    }

    await $`sudo ip route flush cache`.quiet();

    console.log("[+] Правила маршрутизации для Google добавлены");
}

// Отключить VPN
async function stopVPN() {
    console.log("[*] Отключаем VPN...");
    
    const ips = await fetchGoogleIPs();

    for (const ip of ips) {
        await $`sudo ip rule del to ${ip} lookup ${TABLE_ID}`.quiet();
    }

    await $`sudo ip route flush table ${TABLE_ID}`.quiet();

    await $`sudo wg-quick down wg0`.quiet();
    console.log("[-] WireGuard остановлен и маршруты удалены");
}

await startVPN()

console.log('VPN запущен')
