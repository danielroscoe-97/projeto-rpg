<?php if (!defined('FLUX_ROOT')) exit; ?>
<?php
	$adminMenuItems = $this->getAdminMenuItems();
	$menuItems = $this->getMenuItems();
	
	if( $params->get('module') != 'main' ): ?>
	<?php if ($session->isLoggedIn()): ?>
	<div class="loginbox-admin-menu">
	<table cellspacing="0" cellpadding="0">
		<?php if (!empty($adminMenuItems) && Flux::config('AdminMenuNewStyle')): ?>
		<?php $mItems = array(); foreach ($adminMenuItems as $menuItem) $mItems[] = sprintf('<a href="%s">%s</a>', $menuItem['url'], Flux::message($menuItem['name'])) ?>
		<tr>
			<td>
				<strong>Admin</strong>: <?php echo implode(' • ', $mItems) ?>
			</td>
		</tr>
		<?php endif ?>
	</table>
	</div>
	<?php endif ?>
<?php endif ?>

<?php $subMenuItems = $this->getSubMenuItems(); $menus = array() ?>
<?php if (!empty($subMenuItems)): ?>
	<div id="submenu">Menu:
	<?php foreach ($subMenuItems as $menuItem): ?>
		<?php $menus[] = sprintf('<a href="%s" class="sub-menu-item%s">%s</a>',
			$this->url($menuItem['module'], $menuItem['action']),
			$params->get('module') == $menuItem['module'] && $params->get('action') == $menuItem['action'] ? ' current-sub-menu' : '',
			htmlspecialchars($menuItem['name'])) ?>
	<?php endforeach ?>
	<?php echo implode(' / ', $menus) ?>
	</div>
<?php endif ?>
