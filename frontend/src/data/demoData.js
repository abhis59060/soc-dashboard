export const generateDemoLogs = () => {
  const now = new Date();
  
  return {
    stats: {
      totalLogs: 15420,
      highAlerts: 23,
      mediumAlerts: 156,
      lowAlerts: 892,
      windowsEvents: 5234,
      linuxEvents: 6789,
      firewallEvents: 3397,
      last24h: 1247
    },
    
    recentAlerts: [
      {
        id: 1,
        severity: 'high',
        title: 'SSH Brute Force Detected',
        description: 'Multiple failed login attempts from IP 185.220.101.45',
        source_ip: '185.220.101.45',
        target: 'linux-server-01',
        timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
        os: 'linux',
        event_type: 'auth',
        count: 45
      },
      {
        id: 2,
        severity: 'high',
        title: 'Windows Privilege Escalation',
        description: 'User admin attempted unauthorized privilege escalation',
        source_ip: '192.168.1.105',
        target: 'windows-dc-01',
        timestamp: new Date(now - 1000 * 60 * 12).toISOString(),
        os: 'windows',
        event_type: 'security',
        event_id: 4672
      },
      {
        id: 3,
        severity: 'medium',
        title: 'Firewall Block - Port Scan',
        description: 'Blocked connection attempt to port 22 from external IP',
        source_ip: '45.33.22.11',
        target: 'firewall-main',
        timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        os: 'firewall',
        event_type: 'ufw',
        port: 22
      },
      {
        id: 4,
        severity: 'high',
        title: 'Failed Admin Login',
        description: 'Multiple failed login attempts for user Administrator',
        source_ip: '203.0.113.45',
        target: 'windows-workstation-03',
        timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        os: 'windows',
        event_type: 'security',
        event_id: 4625
      },
      {
        id: 5,
        severity: 'medium',
        title: 'Suspicious Process Creation',
        description: 'PowerShell executed with encoded command',
        source_ip: '192.168.1.45',
        target: 'windows-server-02',
        timestamp: new Date(now - 1000 * 60 * 32).toISOString(),
        os: 'windows',
        event_type: 'security',
        event_id: 4688
      },
      {
        id: 6,
        severity: 'low',
        title: 'Normal Login',
        description: 'Successful login for user john.doe',
        source_ip: '192.168.1.20',
        target: 'linux-workstation-01',
        timestamp: new Date(now - 1000 * 60 * 45).toISOString(),
        os: 'linux',
        event_type: 'auth'
      }
    ],
    
    windowsLogs: [
      {
        id: 'win-001',
        timestamp: new Date(now - 1000 * 60 * 5).toISOString(),
        event_id: 4625,
        level: 'Error',
        source: 'Security',
        message: 'An account failed to log on. Subject: Administrator, Status: 0xC000006D',
        computer: 'WINDOWS-DC01',
        user: 'Administrator',
        ip: '203.0.113.45',
        severity: 'high'
      },
      {
        id: 'win-002',
        timestamp: new Date(now - 1000 * 60 * 12).toISOString(),
        event_id: 4672,
        level: 'Information',
        source: 'Security',
        message: 'Special privileges assigned to new logon. Privileges: SeDebugPrivilege',
        computer: 'WINDOWS-SRV02',
        user: 'SYSTEM',
        ip: '192.168.1.105',
        severity: 'high'
      },
      {
        id: 'win-003',
        timestamp: new Date(now - 1000 * 60 * 18).toISOString(),
        event_id: 4688,
        level: 'Information',
        source: 'Security',
        message: 'A new process has been created. Command: powershell.exe -enc UwB0AGEAcgB0AC0AUwBsAGUAZQBwACAALQBzACAAMQAwAA==',
        computer: 'WINDOWS-WS03',
        user: 'jdoe',
        ip: '192.168.1.45',
        severity: 'medium'
      },
      {
        id: 'win-004',
        timestamp: new Date(now - 1000 * 60 * 25).toISOString(),
        event_id: 4624,
        level: 'Success',
        source: 'Security',
        message: 'An account was successfully logged on. Logon Type: 3 (Network)',
        computer: 'WINDOWS-DC01',
        user: 'backup_svc',
        ip: '192.168.1.10',
        severity: 'low'
      },
      {
        id: 'win-005',
        timestamp: new Date(now - 1000 * 60 * 35).toISOString(),
        event_id: 4648,
        level: 'Information',
        source: 'Security',
        message: 'A logon was attempted using explicit credentials. Target: admin',
        computer: 'WINDOWS-SRV01',
        user: 'jsmith',
        ip: '192.168.1.50',
        severity: 'medium'
      }
    ],
    
    linuxLogs: [
      {
        id: 'lin-001',
        timestamp: new Date(now - 1000 * 60 * 2).toISOString(),
        type: 'auth',
        service: 'sshd',
        message: 'Failed password for root from 185.220.101.45 port 54322 ssh2',
        host: 'linux-server-01',
        user: 'root',
        source_ip: '185.220.101.45',
        port: 54322,
        severity: 'high'
      },
      {
        id: 'lin-002',
        timestamp: new Date(now - 1000 * 60 * 3).toISOString(),
        type: 'auth',
        service: 'sshd',
        message: 'Failed password for root from 185.220.101.45 port 54323 ssh2',
        host: 'linux-server-01',
        user: 'root',
        source_ip: '185.220.101.45',
        port: 54323,
        severity: 'high'
      },
      {
        id: 'lin-003',
        timestamp: new Date(now - 1000 * 60 * 8).toISOString(),
        type: 'sudo',
        service: 'sudo',
        message: 'user john.doe : TTY=pts/0 ; PWD=/home/john ; USER=root ; COMMAND=/bin/cat /etc/shadow',
        host: 'linux-workstation-01',
        user: 'john.doe',
        target_user: 'root',
        command: '/bin/cat /etc/shadow',
        severity: 'high'
      },
      {
        id: 'lin-004',
        timestamp: new Date(now - 1000 * 60 * 15).toISOString(),
        type: 'auth',
        service: 'sshd',
        message: 'Accepted publickey for deploy from 192.168.1.20 port 51234 ssh2',
        host: 'linux-server-02',
        user: 'deploy',
        source_ip: '192.168.1.20',
        port: 51234,
        severity: 'low'
      },
      {
        id: 'lin-005',
        timestamp: new Date(now - 1000 * 60 * 22).toISOString(),
        type: 'cron',
        service: 'CRON',
        message: '(root) CMD (/usr/local/bin/backup.sh)',
        host: 'linux-server-01',
        user: 'root',
        command: '/usr/local/bin/backup.sh',
        severity: 'low'
      },
      {
        id: 'lin-006',
        timestamp: new Date(now - 1000 * 60 * 28).toISOString(),
        type: 'auth',
        service: 'sshd',
        message: 'Connection closed by authenticating user admin 45.33.22.11 port 45678 [preauth]',
        host: 'linux-server-03',
        user: 'admin',
        source_ip: '45.33.22.11',
        port: 45678,
        severity: 'medium'
      }
    ],
    
    firewallLogs: [
      {
        id: 'fw-001',
        timestamp: new Date(now - 1000 * 60 * 1).toISOString(),
        action: 'BLOCK',
        protocol: 'TCP',
        source_ip: '185.220.101.45',
        source_port: 54322,
        dest_ip: '192.168.1.100',
        dest_port: 22,
        interface: 'eth0',
        rule: 'ufw-user-input',
        severity: 'high',
        message: '[UFW BLOCK] IN=eth0 OUT= MAC=00:50:56:c0:00:08 SRC=185.220.101.45 DST=192.168.1.100 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=12345 DF PROTO=TCP SPT=54322 DPT=22 WINDOW=29200 RES=0x00 SYN URGP=0'
      },
      {
        id: 'fw-002',
        timestamp: new Date(now - 1000 * 60 * 6).toISOString(),
        action: 'BLOCK',
        protocol: 'TCP',
        source_ip: '45.33.22.11',
        source_port: 45678,
        dest_ip: '192.168.1.101',
        dest_port: 3389,
        interface: 'eth0',
        rule: 'ufw-user-input',
        severity: 'high',
        message: '[UFW BLOCK] IN=eth0 OUT= MAC=00:50:56:c0:00:08 SRC=45.33.22.11 DST=192.168.1.101 LEN=52 TOS=0x00 PREC=0x00 TTL=117 ID=23456 DF PROTO=TCP SPT=45678 DPT=3389 WINDOW=64240 RES=0x00 SYN URGP=0'
      },
      {
        id: 'fw-003',
        timestamp: new Date(now - 1000 * 60 * 14).toISOString(),
        action: 'ALLOW',
        protocol: 'TCP',
        source_ip: '192.168.1.20',
        source_port: 51234,
        dest_ip: '192.168.1.100',
        dest_port: 22,
        interface: 'eth0',
        rule: 'ufw-user-input',
        severity: 'low',
        message: '[UFW ALLOW] IN=eth0 OUT= MAC=00:50:56:c0:00:08 SRC=192.168.1.20 DST=192.168.1.100 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=34567 DF PROTO=TCP SPT=51234 DPT=22 WINDOW=29200 RES=0x00 SYN URGP=0'
      },
      {
        id: 'fw-004',
        timestamp: new Date(now - 1000 * 60 * 20).toISOString(),
        action: 'BLOCK',
        protocol: 'UDP',
        source_ip: '192.168.1.200',
        source_port: 123,
        dest_ip: '239.255.255.250',
        dest_port: 1900,
        interface: 'eth0',
        rule: 'ufw-user-input',
        severity: 'medium',
        message: '[UFW BLOCK] IN=eth0 OUT= MAC=01:00:5e:7f:ff:fa SRC=192.168.1.200 DST=239.255.255.250 LEN=432 TOS=0x00 PREC=0x00 TTL=4 ID=45678 DF PROTO=UDP SPT=123 DPT=1900 LEN=412'
      },
      {
        id: 'fw-005',
        timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
        action: 'BLOCK',
        protocol: 'TCP',
        source_ip: '203.0.113.45',
        source_port: 56789,
        dest_ip: '192.168.1.102',
        dest_port: 445,
        interface: 'eth0',
        rule: 'ufw-user-input',
        severity: 'high',
        message: '[UFW BLOCK] IN=eth0 OUT= MAC=00:50:56:c0:00:08 SRC=203.0.113.45 DST=192.168.1.102 LEN=48 TOS=0x00 PREC=0x00 TTL=128 ID=56789 DF PROTO=TCP SPT=56789 DPT=445 WINDOW=64240 RES=0x00 SYN URGP=0'
      }
    ],
    
    chartData: {
      alertsByHour: [
        { hour: '00:00', high: 2, medium: 8, low: 15 },
        { hour: '02:00', high: 1, medium: 5, low: 12 },
        { hour: '04:00', high: 0, medium: 3, low: 8 },
        { hour: '06:00', high: 3, medium: 12, low: 20 },
        { hour: '08:00', high: 5, medium: 18, low: 35 },
        { hour: '10:00', high: 8, medium: 25, low: 48 },
        { hour: '12:00', high: 4, medium: 15, low: 30 },
        { hour: '14:00', high: 6, medium: 22, low: 42 },
        { hour: '16:00', high: 7, medium: 20, low: 38 },
        { hour: '18:00', high: 3, medium: 14, low: 28 },
        { hour: '20:00', high: 2, medium: 10, low: 22 },
        { hour: '22:00', high: 1, medium: 6, low: 18 }
      ],
      
      osDistribution: [
        { name: 'Windows', value: 5234, color: '#00d4ff' },
        { name: 'Linux', value: 6789, color: '#7c3aed' },
        { name: 'Firewall', value: 3397, color: '#10b981' }
      ],
      
      topThreatIPs: [
        { ip: '185.220.101.45', count: 156, country: 'RU', threat: 'Brute Force' },
        { ip: '45.33.22.11', count: 89, country: 'CN', threat: 'Port Scan' },
        { ip: '203.0.113.45', count: 67, country: 'US', threat: 'Credential Stuffing' },
        { ip: '198.51.100.22', count: 45, country: 'BR', threat: 'Malware C2' },
        { ip: '192.0.2.15', count: 34, country: 'DE', threat: 'Reconnaissance' }
      ]
    }
  };
};

export const demoData = generateDemoLogs();