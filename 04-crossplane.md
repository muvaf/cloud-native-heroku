# Add Infrastructure

In the earlier steps, we set up a template with the basic Heroku experience;
* Create repo to deploy immediately,
* Push commit to deploy directly,
* (extra) Run in our own cluster.

Many applications require infrastructure such as databases, buckets, caches, you
name it. We will use Crossplane claims in our Helm chart to request these
resources.

