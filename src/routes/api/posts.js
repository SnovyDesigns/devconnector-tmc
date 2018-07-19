const express = require('express');
const router = express.Router();
const passport = require('passport');

// Post model
const Post = require('../../models/Post');
// Profile model
const Profile = require('../../models/Profile');

// Validation
const validatePostInput = require('../../validation/post');

// @route   GET api/posts
// @desc    Get all posts
// @access  Public
router.get('/', (req, res) => {
  const errors = {};
  errors.nopostsfound = 'No posts found';

  Post.find()
    .sort({ date: -1 })
    .then(posts => res.json(posts))
    .catch(err => res.status(404).json(errors));
});

// @route   GET api/posts/:post_id
// @desc    Get single post by ID
// @access  Public
router.get('/:post_id', (req, res) => {
  const errors = {};
  errors.nopostfound = 'No post found with that ID';

  Post.findById(req.params.post_id)
    .then(post => res.json(post))
    .catch(err => res.status(404).json(errors));
});

// @route   POST api/posts
// @desc    Create post
// @access  Private
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      // If any errors, send 400 with errors object
      return res.status(400).json(errors);
    }

    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });

    newPost.save().then(post => res.json(post));
  }
);

// @route   DELETE api/posts/:post_id
// @desc    Delete post
// @access  Private
router.delete(
  '/:post_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const errors = {};

    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.post_id)
        .then(post => {
          // Check for post owner
          if (post.user.toString() !== req.user.id) {
            errors.notauthorized = 'You are not authorized to delete this post';
            return res.status(401).json(errors);
          }

          // Delete
          post.remove().then(() => res.json({ success: true }));
        })
        .catch(err => {
          errors.postnotfound = 'No post found';
          res.status(404).json(errors);
        });
    });
  }
);

// @route   POST api/posts/like/:post_id
// @desc    Like post
// @access  Private
router.post(
  '/like/:post_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const errors = {};

    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.post_id)
        .then(post => {
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length > 0
          ) {
            errors.alreadyliked = 'You already liked this post';
            return res.status(400).json(errors);
          }

          // Add user id to likes array
          post.likes.unshift({ user: req.user.id });

          post.save().then(post => res.json(post));
        })
        .catch(err => {
          errors.postnotfound = 'No post found';
          res.status(404).json(errors);
        });
    });
  }
);

// @route   POST api/posts/unlike/:post_id
// @desc    Unlike post
// @access  Private
router.post(
  '/unlike/:post_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const errors = {};

    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.post_id)
        .then(post => {
          if (
            post.likes.filter(like => like.user.toString() === req.user.id)
              .length === 0
          ) {
            errors.notliked = 'You have not yet liked this post';
            return res.status(400).json(errors);
          }

          const updatedLikes = post.likes.filter(
            like => like.user.toString() !== req.user.id
          );
          post.likes = updatedLikes;

          // Save
          post.save().then(post => res.json(post));
        })
        .catch(err => {
          errors.postnotfound = 'No post found';
          res.status(404).json(errors);
        });
    });
  }
);

// @route   POST api/posts/comment/:post_id
// @desc    Add comment to post
// @access  Private
router.post(
  '/comment/:post_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);

    // Check Validation
    if (!isValid) {
      // If any errors, send 400 with errors object
      return res.status(400).json(errors);
    }

    Post.findById(req.params.post_id)
      .then(post => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };

        // Add to comments array
        post.comments.unshift(newComment);

        // Save
        post.save().then(post => res.json(post));
      })
      .catch(err => {
        errors.postnotfound = 'No post found';
        res.status(404).json(errors);
      });
  }
);

// @route   DELETE api/posts/comment/:post_id/:comment_id
// @desc    Remove comment from post
// @access  Private
router.delete(
  '/comment/:post_id/:comment_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const errors = {};

    Post.findById(req.params.post_id)
      .then(post => {
        // Check to see if comment exists
        if (
          post.comments.filter(
            comment => comment._id.toString() === req.params.comment_id
          ).length === 0
        ) {
          errors.commentnotexists = 'Comment does not exist';
          return res.status(404).json(errors);
        }

        // Check if user is comment owner
        if (
          post.comments.filter(
            comment =>
              comment._id.toString() === req.params.comment_id &&
              comment.user.toString() === req.user.id
          ).length === 0
        ) {
          errors.notauthorized = 'You are not authorized to delete this post';
          return res.status(404).json(errors);
        }

        const updatedComments = post.comments.filter(
          comment => comment._id.toString() !== req.params.comment_id
        );
        post.comments = updatedComments;

        // Save
        post.save().then(post => res.json(post));
      })
      .catch(err => {
        errors.postnotfound = 'No post found';
        res.status(404).json(errors);
      });
  }
);

module.exports = router;
