<?php if (!defined('FLUX_ROOT')) exit; ?>

<!-- Template genérico para páginas que não possuem template específico -->
<?php if (isset($title)): ?>
  <h2><?php echo htmlspecialchars($title) ?></h2>
<?php endif ?>

<?php if (isset($content)): ?>
  <div class="page-generic">
    <?php echo $content ?>
  </div>
<?php else: ?>
  <p style="color:var(--text-tertiary)">
    <i class="fa fa-info-circle"></i> Esta página ainda não possui conteúdo.
  </p>
<?php endif ?>
