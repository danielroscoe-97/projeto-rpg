<?php if (!defined('FLUX_ROOT')) exit;

// Server Status
require_once (FLUX_MODULE_DIR."/server/status.php");

$online = "<img src=" . $this->themePath('img/poporing.gif') . " width='20px' />";
$offline = "<img src=" . $this->themePath('img/poring.gif') . " width='20px' />";
//$online = '<span style="color: #06f59d"">Online</span>';
//$offline = '<span style="color: red">Offline</span>';

    foreach ($serverStatus as $privServerName => $gameServers): 
        foreach ($gameServers as $serverName => $gameServer): 
            if ($gameServer['loginServerUp']) { $loginonline = true; } else { $loginonline = false; } 
            if ($gameServer['charServerUp']) { $charonline = true; } else { $charonline = false; }
            if ($gameServer['mapServerUp']) { $maponline = true; } else { $maponline = false; } 
        endforeach;
    endforeach;
	
?>