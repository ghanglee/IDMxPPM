const IdmSpec = require('../models/IdmSpec');

/**
 * Count ERs recursively in erHierarchy
 */
function countERs(erHierarchy) {
  if (!Array.isArray(erHierarchy)) return 0;
  let count = 0;
  for (const er of erHierarchy) {
    count += 1;
    if (er.subERs) count += countERs(er.subERs);
  }
  return count;
}

/**
 * Extract denormalized fields from projectData
 */
function extractMetadata(projectData) {
  const header = projectData?.headerData || {};
  return {
    title: header.title || '',
    shortTitle: header.shortTitle || '',
    status: header.status || 'NP',
    version: header.version || '1.0',
    idmGuid: header.idmGuid || '',
    ucGuid: header.ucGuid || '',
    bcmGuid: header.bcmGuid || '',
    erCount: countERs(projectData?.erHierarchy),
    language: header.language || 'EN',
    tags: header.keywords || []
  };
}

exports.listSpecs = async (req, res, next) => {
  try {
    const { search, status, owner, tag, page = 1, limit = 20, sort = 'updatedAt', order = 'desc' } = req.query;

    const filter = {};

    if (search) {
      filter.$text = { $search: search };
    }

    if (status) {
      filter.status = status;
    }

    if (owner) {
      filter.owner = owner;
    }

    if (tag) {
      filter.tags = tag;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const sortOrder = order === 'asc' ? 1 : -1;

    const [specs, total] = await Promise.all([
      IdmSpec.find(filter)
        .select('-projectData -thumbnail')
        .populate('owner', 'name email organization')
        .sort({ [sort]: sortOrder })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      IdmSpec.countDocuments(filter)
    ]);

    res.json({
      specs,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    next(error);
  }
};

exports.getSpec = async (req, res, next) => {
  try {
    const spec = await IdmSpec.findById(req.params.id)
      .populate('owner', 'name email organization')
      .populate('lastEditedBy', 'name email');

    if (!spec) {
      return res.status(404).json({ message: 'Specification not found' });
    }

    res.json({ spec });
  } catch (error) {
    next(error);
  }
};

exports.createSpec = async (req, res, next) => {
  try {
    const { projectData } = req.body;

    if (!projectData) {
      return res.status(400).json({ message: 'projectData is required' });
    }

    const metadata = extractMetadata(projectData);

    const spec = new IdmSpec({
      owner: req.user.userId,
      lastEditedBy: req.user.userId,
      ...metadata,
      projectData
    });

    await spec.save();

    res.status(201).json({ spec: { ...spec.toObject(), projectData: undefined } });
  } catch (error) {
    next(error);
  }
};

exports.updateSpec = async (req, res, next) => {
  try {
    const { projectData } = req.body;

    if (!projectData) {
      return res.status(400).json({ message: 'projectData is required' });
    }

    const spec = await IdmSpec.findById(req.params.id);
    if (!spec) {
      return res.status(404).json({ message: 'Specification not found' });
    }

    // Only owner or admin can update
    if (spec.owner.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this specification' });
    }

    const metadata = extractMetadata(projectData);

    Object.assign(spec, metadata);
    spec.projectData = projectData;
    spec.lastEditedBy = req.user.userId;

    await spec.save();

    res.json({ spec: { ...spec.toObject(), projectData: undefined } });
  } catch (error) {
    next(error);
  }
};

exports.deleteSpec = async (req, res, next) => {
  try {
    const spec = await IdmSpec.findById(req.params.id);
    if (!spec) {
      return res.status(404).json({ message: 'Specification not found' });
    }

    // Only owner or admin can delete
    if (spec.owner.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this specification' });
    }

    await spec.deleteOne();

    res.json({ message: 'Specification deleted' });
  } catch (error) {
    next(error);
  }
};
